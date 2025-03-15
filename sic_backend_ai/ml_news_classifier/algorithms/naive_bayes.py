import pandas as pd
import numpy as np
from sklearn.naive_bayes import MultinomialNB
import joblib
from django.utils import timezone
from ml_news_classifier.models import MLExperiment, FeatureImportance
from data_news_api.models import Article, Feature, MLModel
import os
from django.db import transaction
from django.db.models import Count, Q

class NaiveBayesNewsClassifier:
    """
    Clasificador de noticias basado en Naive Bayes
    """
    
    def __init__(self, alpha=1.0):
        """
        Inicializar el clasificador con parámetros
        
        Args:
            alpha (float): Parámetro de suavizado (Laplace smoothing)
        """
        self.alpha = alpha
        self.model = MultinomialNB(alpha=alpha)
        self.model_id = None
        self.feature_names = None
    
    def prepare_data(self, include_features=None, exclude_features=None):
        """
        Prepara los datos para entrenamiento
        
        Args:
            include_features: Lista de prefijos de características a incluir
            exclude_features: Lista de prefijos de características a excluir
        
        Returns:
            X (DataFrame): Características
            y (array): Etiquetas (0=falso, 1=verdadero)
            feature_names: Lista de nombres de características
        """
        # Obtener artículos de entrenamiento con etiquetas conocidas
        articles = Article.objects.filter(
            in_training_set=True,
            label__in=[Article.TRUE, Article.FALSE]
        )
        
        article_ids = list(articles.values_list('id', flat=True))
        
        if not article_ids:
            raise ValueError("No hay artículos de entrenamiento disponibles")
        
        # Obtener características
        features = Feature.objects.filter(article_id__in=article_ids)
        
        # Aplicar filtros de inclusión/exclusión
        if include_features:
            include_conditions = Q()
            for prefix in include_features:
                include_conditions |= Q(feature_name__startswith=prefix)
            features = features.filter(include_conditions)
        
        if exclude_features:
            exclude_conditions = Q()
            for prefix in exclude_features:
                exclude_conditions |= Q(feature_name__startswith=prefix)
            features = features.exclude(exclude_conditions)
        
        # Crear DataFrame
        df = pd.DataFrame(list(features.values('article_id', 'feature_name', 'feature_value')))
        
        if df.empty:
            raise ValueError("No hay características disponibles para los artículos seleccionados")
        
        # Pivotear para tener características como columnas
        X_df = df.pivot(index='article_id', columns='feature_name', values='feature_value')
        X_df = X_df.fillna(0)  # Rellenar NaN con 0
        
        # Obtener etiquetas
        article_labels = {
            a.id: (1 if a.label == Article.TRUE else 0) 
            for a in articles
        }
        
        # Filtrar para incluir solo artículos con características
        article_ids_with_features = list(X_df.index)
        
        y = np.array([article_labels[aid] for aid in article_ids_with_features if aid in article_labels])
        
        # Guardar nombres de características para uso futuro
        self.feature_names = X_df.columns.tolist()
        
        print(f"Datos preparados: {X_df.shape[0]} ejemplos, {X_df.shape[1]} características")
        
        return X_df, y, self.feature_names
    
    def train(self, experiment_name, include_features=None, exclude_features=None):
        """
        Entrena el modelo con los datos preparados y guarda el modelo
        
        Args:
            experiment_name: Nombre del experimento
            include_features: Lista de prefijos de características a incluir
            exclude_features: Lista de prefijos de características a excluir
            
        Returns:
            MLExperiment: Objeto de experimento creado
        """
        X_df, y, feature_names = self.prepare_data(include_features, exclude_features)
        
        # Verificar que hay suficientes datos
        if len(y) < 10:
            raise ValueError(f"Muy pocos ejemplos para entrenar ({len(y)})")
        
        # Crear experimento
        with transaction.atomic():
            experiment = MLExperiment.objects.create(
                name=experiment_name,
                algorithm_name='Naive Bayes',
                parameters={
                    'alpha': self.alpha,
                    'include_features': include_features,
                    'exclude_features': exclude_features
                },
                description=f"Clasificador Naive Bayes (alpha={self.alpha}) entrenado con {len(y)} ejemplos",
                created_at=timezone.now()
            )
            
            # Entrenar modelo
            print(f"Entrenando Naive Bayes con {len(y)} ejemplos...")
            self.model.fit(X_df, y)
            
            # Crear directorio para modelos si no existe
            os.makedirs('ml_models', exist_ok=True)
            
            # Guardar modelo en archivo
            model_filename = f"ml_models/naive_bayes_{experiment.id}.joblib"
            joblib.dump(self.model, model_filename)
            
            # Crear registro de modelo
            model = MLModel.objects.create(
                name=f"NaiveBayes-{experiment.id}",
                description=f"Naive Bayes para {experiment_name}",
                algorithm='naive_bayes',
                experiment=experiment,
                created_at=timezone.now()
            )
            
            # Asociar archivo al modelo
            with open(model_filename, 'rb') as f:
                model.model_file.save(os.path.basename(model_filename), f)
            
            # Guardar referencia al modelo en la clase
            self.model_id = model.id
            
            # Actualizar experimento con referencia al modelo
            experiment.ml_model = model
            experiment.save()
            
            # Calcular y guardar importancia de características
            # Naive Bayes no tiene feature_importances_, pero podemos usar las log probabilidades
            if hasattr(self.model, 'feature_log_prob_'):
                feature_importances = np.abs(self.model.feature_log_prob_[1] - self.model.feature_log_prob_[0])
                
                # Normalizar
                feature_importances = feature_importances / np.sum(feature_importances)
                
                # Guardar en la base de datos
                for i, feature_name in enumerate(feature_names):
                    FeatureImportance.objects.create(
                        experiment=experiment,
                        feature_name=feature_name,
                        importance=feature_importances[i]
                    )
        
        return experiment
    
    def load(self, model_id):
        """
        Carga un modelo entrenado desde la base de datos
        
        Args:
            model_id: ID del modelo a cargar
        """
        try:
            model_record = MLModel.objects.get(id=model_id)
        except MLModel.DoesNotExist:
            raise ValueError(f"No se encontró un modelo con ID {model_id}")
            
        if model_record.algorithm != 'naive_bayes':
            raise ValueError(f"El modelo con ID {model_id} no es un clasificador Naive Bayes")
            
        if model_record.model_file:
            self.model = joblib.load(model_record.model_file.path)
        else:
            model_path = f"ml_models/naive_bayes_{model_record.id}.joblib"
            if os.path.exists(model_path):
                self.model = joblib.load(model_path)
            else:
                raise FileNotFoundError(f"No se encontró el archivo del modelo: {model_path}")
        
        self.model_id = model_id
        
        # Obtener nombres de características si están disponibles
        if hasattr(self.model, 'feature_names_in_'):
            self.feature_names = self.model.feature_names_in_.tolist()
        
        return self
    
    def predict(self, article):
        """
        Predice si un artículo es verdadero o falso
        
        Args:
            article: Objeto Article a predecir
            
        Returns:
            tuple: (label, confidence)
            - label: Article.TRUE o Article.FALSE
            - confidence: Valor entre 0 y 1
        """
        # Verificar que el modelo está cargado
        if self.model is None:
            raise ValueError("El modelo no está cargado. Usa load() o train() primero.")
        
        # Obtener características del artículo
        features = Feature.objects.filter(article=article)
        
        if not features.exists():
            raise ValueError(f"El artículo {article.id} no tiene características extraídas")
        
        # Convertir a diccionario
        feature_dict = {f.feature_name: f.feature_value for f in features}
        
        # Crear vector de características
        X = np.zeros((1, len(self.feature_names))) if self.feature_names else None
        
        if X is not None and self.feature_names:
            for i, feature in enumerate(self.feature_names):
                if feature in feature_dict:
                    X[0, i] = feature_dict[feature]
        else:
            # Crear DataFrame con todas las características
            all_features = list(feature_dict.keys())
            X = pd.DataFrame({feature: [feature_dict.get(feature, 0)] for feature in all_features})
        
        # Predecir
        try:
            y_pred = self.model.predict(X)
            probas = self.model.predict_proba(X)[0]
            confidence = max(probas)
            
            # Determinar etiqueta
            label = Article.TRUE if y_pred[0] == 1 else Article.FALSE
            
            return label, confidence
            
        except Exception as e:
            print(f"Error al predecir: {str(e)}")
            import traceback
            print(traceback.format_exc())
            return Article.UNKNOWN, 0.5
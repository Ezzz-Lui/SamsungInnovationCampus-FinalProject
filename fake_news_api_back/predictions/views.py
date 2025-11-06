from rest_framework.views import APIView
from rest_framework import parsers
from rest_framework.parsers import MultiPartParser
from ml_models.processor import extract_text_from_image
from rest_framework.response import Response
from rest_framework import status
from ml_models.models import MODELS, VECTORIZER
from ml_models.processor import preprocess_text
from drf_yasg.utils import swagger_auto_schema
from drf_yasg import openapi
from .serializers import PredictNewsSerializer
from predictions.models import Prediction, TrainingStats
import time
import requests
import json
from django.conf import settings
from rest_framework.decorators import api_view
from newspaper import Article
from django.http import JsonResponse
import os


class ExplanationGenerator:
    def __init__(self, api_key, api_url):
        self.api_key = api_key
        self.url = api_url

    def generate_explanation(self, text, predictions, final_prediction, confidence):
        prompt = f"""
        Eres un asistente experto en análisis de noticias, especializado en detectar si una noticia es falsa o real.

        Tu tarea es analizar el siguiente texto de noticia y los resultados de la predicción para explicar de manera clara y sencilla por qué se concluyó que la noticia es {final_prediction}. Asegúrate de que el texto no contenga lenguaje violento, sexual, de odio o de autolesión.

        ### Texto de la noticia:
        {text}

        ### Resultados de la predicción:
        {json.dumps(predictions, indent=2)}

        ### Predicción final:
        {final_prediction}

        ### Confianza del modelo:
        {confidence}

        Por favor, genera una explicación detallada siguiendo esta estructura:

        1. Análisis del texto: Identifica y describe los elementos clave del texto (como el tono emocional, la ausencia de fuentes confiables o inconsistencias en los datos) que pudieron influir en la predicción.
        2. Razones del resultado: Explica, en términos sencillos, cómo el modelo llegó a la conclusión de que la noticia es {final_prediction} basándose en los resultados obtenidos.
        3. Factores relevantes: Menciona otros aspectos o detalles del texto y del contexto que podrían influir en la confianza del resultado.

        Asegúrate de que la explicación sea clara, concisa y comprensible para un público general sin conocimientos técnicos en inteligencia artificial, LO IMPORTANTE ES EL ANALISIS DE LA NOTICIA.
        """

        headers = {
            "api-key": self.api_key,
            "Content-Type": "application/json",
        }

        data = {
            "messages": [
                {"role": "system", "content": "Eres un asistente que explica predicciones de noticias."},
                {"role": "user", "content": prompt}
            ],
            "max_tokens": 1000,  
            "temperature": 0.7  
        }

        try:
            response = requests.post(self.url, headers=headers, json=data)
            response.raise_for_status()  
            explanation = response.json().get("choices", [{}])[0].get("message", {}).get("content", "")
            return explanation if explanation else "No se generó una explicación válida."
        except requests.exceptions.RequestException as e:
            print(f"Error en la solicitud a la API: {e}")
            print(f"Respuesta de la API: {getattr(response, 'text', 'No hay respuesta')}")
            return "No se pudo generar una explicación en este momento."


explanation_generator = ExplanationGenerator(api_key=settings.AZURE_OPENAI_API_KEY, api_url=settings.AZURE_OPENAI_API_URL)


class PredictNewsView(APIView):
    @swagger_auto_schema(
        operation_description="Predice si una noticia es falsa o real usando el modelo por defecto (logistic).",
        request_body=PredictNewsSerializer,
        tags=['Predictions (default model)'], 
    )
    def post(self, request):
        serializer = PredictNewsSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        text = serializer.validated_data["text"]
        model = MODELS.get("logistic")

        clean_text = preprocess_text(text)
        text_vectorized = VECTORIZER.transform([clean_text])
        prediction = model.predict(text_vectorized)[0]
        prediction_label = "Fake" if prediction == 1 else "Real"

        
        Prediction.objects.create(
            text=text,
            prediction=prediction_label,
            model_used="logistic"
        )
        print("✅ Predicción guardada en la base de datos.")

        explanation = explanation_generator.generate_explanation(
            text,
            {"logistic": {"prediction": prediction_label, "accuracy": 0.7525, "prediction_time": 0.0023}},
            prediction_label,
            0.7525
        )

        return Response(
            {
                "predictions": {
                    "logistic": {
                        "prediction": prediction_label,
                        "accuracy": 0.7525,  
                        "prediction_time": 0.0023  
                    }
                },
                "final_prediction": prediction_label,
                "confidence": 0.7525,  
                "explanation": explanation
            },
            status=status.HTTP_200_OK,
        )

class PredictWithModelView(APIView):
    @swagger_auto_schema(
        operation_description="Predice si una noticia es falsa o real usando un modelo específico.",
        manual_parameters=[
            openapi.Parameter(
                "model_type",
                openapi.IN_PATH,
                description=f"Tipo de modelo a usar. Opciones válidas: {', '.join(MODELS.keys())}",
                type=openapi.TYPE_STRING,
                enum=list(MODELS.keys()),
            )
        ],
        tags=['Predictions (specific model)'],  
        request_body=PredictNewsSerializer,
    )
    def post(self, request, model_type):
        serializer = PredictNewsSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        text = serializer.validated_data["text"]
        model = MODELS.get(model_type)
        if not model:
            return Response(
                {"error": f"Invalid model type. Valid options are: {', '.join(MODELS.keys())}"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        clean_text = preprocess_text(text)
        text_vectorized = VECTORIZER.transform([clean_text])
        prediction = model.predict(text_vectorized)[0]
        prediction_label = "Fake" if prediction == 1 else "Real"

        Prediction.objects.create(
            text=text,
            prediction=prediction_label,
            model_used=model_type
        )
        print("✅ Predicción guardada en la base de datos.")

        explanation = explanation_generator.generate_explanation(
            text,
            {model_type: {"prediction": prediction_label, "accuracy": 0.7425, "prediction_time": 0.0156}},
            prediction_label,
            0.7425
        )

        return Response(
            {
                "predictions": {
                    model_type: {
                        "prediction": prediction_label,
                        "accuracy": 0.7425,  
                        "prediction_time": 0.0156  
                    }
                },
                "final_prediction": prediction_label,
                "confidence": 0.7425,  
                "explanation": explanation
            },
            status=status.HTTP_200_OK,
        )

class InsightsView(APIView):
    @swagger_auto_schema(
        operation_description="Devuelve estadísticas generales de las predicciones y los modelos entrenados.",
        tags=["Stats"],  
    )
    def get(self, request):
        total_predictions = Prediction.objects.count()

        real_count = Prediction.objects.filter(prediction="Real").count()
        fake_count = Prediction.objects.filter(prediction="Fake").count()

        last_predictions = Prediction.objects.order_by("-created_at")[:5].values("text", "prediction", "model_used", "created_at")

        model_stats = TrainingStats.objects.all().values("model_name", "accuracy", "trained_at")

        return Response({
            "total_predictions": total_predictions,
            "real_count": real_count,
            "fake_count": fake_count,
            "last_predictions": list(last_predictions),
            "model_stats": list(model_stats),
        }, status=status.HTTP_200_OK)

class ModelStatsView(APIView):
    @swagger_auto_schema(
        operation_description="Devuelve estadísticas específicas de un modelo.",
        manual_parameters=[
            openapi.Parameter(
                "model_name",
                openapi.IN_PATH,
                description=f"Nombre del modelo. Opciones válidas: {', '.join(MODELS.keys())}",
                type=openapi.TYPE_STRING,
                enum=list(MODELS.keys()),  
            )
        ],
        tags=["Model Stats by name"],  
    )
    def get(self, request, model_name):
        stats = TrainingStats.objects.filter(model_name=model_name).first()
        if not stats:
            return Response(
                {"error": "Model not found"},
                status=status.HTTP_404_NOT_FOUND,
            )

        return Response(
            {
                "model_name": stats.model_name,
                "accuracy": stats.accuracy,
                "trained_at": stats.trained_at,
            },
            status=status.HTTP_200_OK,
        )

class PredictWithAllModelsView(APIView):
    @swagger_auto_schema(
        operation_description="Evalúa una noticia con todos los modelos disponibles y devuelve un promedio ponderado.",
        request_body=PredictNewsSerializer,
        tags=["Predictions (all models)"],
    )
    def post(self, request):
        serializer = PredictNewsSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        text = serializer.validated_data["text"]
        clean_text = preprocess_text(text)
        text_vectorized = VECTORIZER.transform([clean_text])

        predictions = {}
        weighted_sum = 0
        total_weight = 0

        for model_name, model in MODELS.items():
            if model is None:
                continue  

            stats = TrainingStats.objects.filter(model_name=model_name).first()
            accuracy = stats.accuracy if stats else 0

            start_time = time.time()
            prediction = model.predict(text_vectorized)[0]
            end_time = time.time()
            prediction_time = round(end_time - start_time, 4)  

            prediction_label = "Fake" if prediction == 1 else "Real"

            Prediction.objects.create(
                text=text,
                prediction=prediction_label,
                model_used=model_name
            )
            print(f"✅ Predicción guardada para el modelo {model_name}.")

            predictions[model_name] = {
                "prediction": prediction_label,
                "accuracy": accuracy,
                "prediction_time": prediction_time,  
            }

            weighted_sum += accuracy * prediction 
            total_weight += accuracy

        final_score = weighted_sum / total_weight if total_weight > 0 else 0
        final_prediction = "Fake" if final_score >= 0.5 else "Real"

        confidence = final_score if final_prediction == "Fake" else 1 - final_score

        explanation = explanation_generator.generate_explanation(
            text,
            predictions,
            final_prediction,
            confidence
        )

        return Response(
            {
                "predictions": predictions,
                "final_prediction": final_prediction,
                "confidence": round(confidence, 4),
                "explanation": explanation
            },
            status=status.HTTP_200_OK,
        )

class PredictFromImageView(APIView):
    parser_classes = [MultiPartParser]

    @swagger_auto_schema(
        operation_description="Sube una imagen con texto de noticia y predice si es real o falsa usando todos los modelos disponibles.",
        tags=["Predictions (from image)"],
        manual_parameters=[
            openapi.Parameter(
                name="image",
                in_=openapi.IN_FORM,
                type=openapi.TYPE_FILE,
                description="Imagen que contiene la noticia",
                required=True,
            )
        ]
    )
    def post(self, request):
        if 'image' not in request.FILES:
            return Response({"error": "No se ha subido una imagen."}, status=400)

        image = request.FILES['image']
        text = extract_text_from_image(image)

        if not text.strip():
            return Response({"error": "No se pudo extraer texto de la imagen."}, status=400)

        clean_text = preprocess_text(text)
        text_vectorized = VECTORIZER.transform([clean_text])

        predictions = {}
        weighted_sum = 0
        total_weight = 0

        for model_name, model in MODELS.items():
            if model is None:
                continue

            stats = TrainingStats.objects.filter(model_name=model_name).first()
            accuracy = stats.accuracy if stats else 0

            start_time = time.time()
            prediction = model.predict(text_vectorized)[0]
            end_time = time.time()
            prediction_time = round(end_time - start_time, 4)

            prediction_label = "Fake" if prediction == 1 else "Real"

            predictions[model_name] = {
                "prediction": prediction_label,
                "accuracy": accuracy,
                "prediction_time": prediction_time,
            }

            weighted_sum += accuracy * prediction
            total_weight += accuracy

        final_score = weighted_sum / total_weight if total_weight > 0 else 0
        final_prediction = "Fake" if final_score >= 0.5 else "Real"
        confidence = final_score if final_prediction == "Fake" else 1 - final_score

        explanation = explanation_generator.generate_explanation(
            text,
            predictions,
            final_prediction,
            confidence
        )

        return Response({
            "extracted_text": text,
            "predictions": predictions,
            "final_prediction": final_prediction,
            "confidence": round(confidence, 4),
            "explanation": explanation
        }, status=status.HTTP_200_OK)
        

@swagger_auto_schema(
    operation_description="Extrae información relevante de un artículo de noticias a partir de su URL y predice si es real o falsa.",
    request_body=openapi.Schema(
        type=openapi.TYPE_OBJECT,
        properties={
            'url': openapi.Schema(type=openapi.TYPE_STRING, description='URL del artículo de noticias'),
        },
        required=['url'],
    ),
    tags=['Article Analysis'],
    method='POST',
)
@api_view(['POST'])
def analyze_article_by_url(request):
    """
    Analyze a news article by its URL and predict if it is real or fake.
    """
    url = request.data.get('url')
    if not url:
        return JsonResponse({'error': 'URL is required'}, status=400)

    try:
        article = Article(url)
        article.download()
        article.parse()

        extracted_data = {
            'title': article.title,
            'publish_date': article.publish_date,
            'text': article.text,
            'top_image': article.top_image,
        }

        if not article.text.strip():
            return JsonResponse({'error': 'No text could be extracted from the URL.'}, status=400)

        clean_text = preprocess_text(article.text)
        text_vectorized = VECTORIZER.transform([clean_text])

        predictions = {}
        weighted_sum = 0
        total_weight = 0

        for model_name, model in MODELS.items():
            if model is None:
                continue

            stats = TrainingStats.objects.filter(model_name=model_name).first()
            accuracy = stats.accuracy if stats else 0

            prediction = model.predict(text_vectorized)[0]
            prediction_label = "Fake" if prediction == 1 else "Real"

            predictions[model_name] = {
                "prediction": prediction_label,
                "accuracy": accuracy,
            }

            weighted_sum += accuracy * prediction  
            total_weight += accuracy

        final_score = weighted_sum / total_weight if total_weight > 0 else 0
        final_prediction = "Fake" if final_score >= 0.5 else "Real"
        confidence = final_score if final_prediction == "Fake" else 1 - final_score
        
        explantion = explanation_generator.generate_explanation(
            article.text,
            predictions,
            final_prediction,
            confidence
        )

        response_data = {
            "article_data": extracted_data,
            "predictions": predictions,
            "final_prediction": final_prediction,
            "confidence": round(confidence, 4),
            "explanation": explantion
        }

        return JsonResponse(response_data, status=200)

    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)
    

SIGHTENGINE_URL = "https://api.sightengine.com/1.0/check.json"
API_USER = os.getenv("SIGHTENGINE_API_USER")
API_SECRET = os.getenv("SIGHTENGINE_API_SECRET")

class DeepfakeDetectionView(APIView):
    parser_classes = [parsers.MultiPartParser, parsers.FormParser]

    @swagger_auto_schema(
        operation_description="Sube una imagen o vídeo para detectar si es generado por IA o es deepfake.",
        tags=["Deepfake Detection"],

    )
    def post(self, request):
        file = request.FILES.get('file')
        if not file:
            return Response({"error": "No file uploaded"}, status=status.HTTP_400_BAD_REQUEST)

        # Detectar tipo por extensión simple
        is_video = file.name.lower().endswith(('.mp4', '.mov', '.avi', '.mkv'))

        # Preparar petición a Sightengine
        files = {'media': file}
        data = {
            'models': 'genai',
            'api_user': API_USER,
            'api_secret': API_SECRET
            
        }

        # Si es vídeo, se puede usar endpoint de vídeo
        if is_video:
            # vídeo síncrono pequeño (< 1 min) según docs: https://.../video/check-sync.json
            # o vídeo largo/async: /video/check.json con callback
            url = "https://api.sightengine.com/1.0/video/check-sync.json"
        else:
            url = SIGHTENGINE_URL  # para imagen

        try:
            resp = requests.post(url, files=files, data=data)
            resp.raise_for_status()
        except Exception as e:
            return Response({"error": f"Error calling Sightengine API: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        result = resp.json()

        # Determinar si es un video (tiene 'frames') o una imagen
        is_video_result = 'data' in result and 'frames' in result['data']

        if is_video_result and result['data']['frames']:
            # Es un video, encontrar la probabilidad máxima de IA entre los fotogramas
            frame_probs = [frame.get('type', {}).get('ai_generated', 0) for frame in result['data']['frames']]
            ai_generated_prob = max(frame_probs) if frame_probs else 0
        else:
            # Es una imagen
            ai_generated_prob = result.get('type', {}).get('ai_generated', 0)

        
        if ai_generated_prob > 0.75:
            final_prediction = "AI-Generated"
            confidence = ai_generated_prob
            explanation_text = f"La imagen o video es muy probablemente generado por IA con una confianza del {confidence:.2%}."
        elif ai_generated_prob > 0.5:
            final_prediction = "Likely AI-Generated"
            confidence = ai_generated_prob
            explanation_text = f"La imagen o video es posiblemente generado por IA con una confianza del {confidence:.2%}."
        else:
            final_prediction = "Likely Real"
            confidence = 1 - ai_generated_prob
            explanation_text = f"La imagen o video es probablemente real con una confianza del {confidence:.2%}."

        media_type = "video" if is_video_result else "imagen"

        prompt_for_explanation = f"""
        Eres un asistente experto en la detección de deepfakes y contenido generado por inteligencia artificial.
        Analiza el siguiente resultado del modelo Sightengine sobre una {media_type}.

        Resultado del análisis: {json.dumps(result, indent=2)}

        Explica de forma sencilla por qué se ha llegado a esta conclusión. 
        - Predicción final: {final_prediction}
        - Confianza: {confidence:.2%}

        Si el archivo es un video, tu explicación debe basarse en el análisis de los fotogramas. Menciona cómo las probabilidades de IA en los diferentes fotogramas llevan a la conclusión final. Por ejemplo, si la mayoría de los fotogramas tienen una alta probabilidad de ser generados por IA, el video es sospechoso.
        
        Si el archivo es una imagen, enfócate en las posibles señales que el modelo pudo haber detectado (piel demasiado suave, fondos distorsionados, etc.).

        Menciona posibles artefactos visuales, inconsistencias en el movimiento, en el parpadeo o en los labios, texturas extrañas o iluminación incoherente que el modelo pudo haber detectado.

        Aclara que esta es una evaluación probabilística y no una certeza absoluta.
        """

        explanation = explanation_generator.generate_explanation(
            prompt_for_explanation,
            result,
            final_prediction,
            confidence
        )

        return Response({
            "final_prediction": final_prediction,
            "confidence": round(confidence, 4),
            "explanation": explanation,
            "raw_result": result # Devolvemos el resultado original por si es útil
        }, status=status.HTTP_200_OK)
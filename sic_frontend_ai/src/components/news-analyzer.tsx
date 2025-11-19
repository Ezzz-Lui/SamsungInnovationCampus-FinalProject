"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import {
  analyzeNews,
  analyzeNewsByImage,
  analyzeNewsByUrl,
  analyzeNewsByAudio, 
  analyzeDeepfake,
} from "@/lib/api";
import {
  Loader2,
  Upload,
  LinkIcon,
  FileText,
  AlertTriangle,
  Terminal,
  Mic,
  ScanFace,
  ShieldCheck, 
  ShieldOff,
  Zap,
  Target,
  CheckCircle,
  Info,
  Video,
  BarChart3
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

// Componente mejorado para mostrar resultados de análisis
function EnhancedAnalysisResults({ result, onReset }: { result: any; onReset: () => void }) {
  if (!result) return null;

  // Detectar si es deepfake
  const isDeepfake = result.raw_result?.type?.ai_generated !== undefined;

  if (isDeepfake) {
    return <EnhancedDeepfakeResults result={result} onReset={onReset} />;
  }

  // Análisis de texto normal
  const { final_prediction = "", explanation = "", predictions, confidence = 0 } = result;

  const getResultConfig = () => {
    const pred = final_prediction.toLowerCase();
    if (pred.includes("real") || pred.includes("true")) {
      return {
        color: "text-green-600 dark:text-green-400",
        bgColor: "bg-green-50 dark:bg-green-950/30",
        borderColor: "border-green-200 dark:border-green-800",
        icon: <CheckCircle className="h-8 w-8 text-green-500 dark:text-green-400" />,
        badge: "Authentic Content",
        badgeColor: "bg-green-100 text-green-800 border-green-200 dark:bg-green-900 dark:text-green-300 dark:border-green-700"
      };
    }
    if (pred.includes("fake") || pred.includes("false")) {
      return {
        color: "text-red-600 dark:text-red-400",
        bgColor: "bg-red-50 dark:bg-red-950/30",
        borderColor: "border-red-200 dark:border-red-800",
        icon: <AlertTriangle className="h-8 w-8 text-red-500 dark:text-red-400" />,
        badge: "False Content",
        badgeColor: "bg-red-100 text-red-800 border-red-200 dark:bg-red-900 dark:text-red-300 dark:border-red-700"
      };
    }
    if (pred.includes("misleading")) {
      return {
        color: "text-amber-600 dark:text-amber-400",
        bgColor: "bg-amber-50 dark:bg-amber-950/30",
        borderColor: "border-amber-200 dark:border-amber-800",
        icon: <AlertTriangle className="h-8 w-8 text-amber-500 dark:text-amber-400" />,
        badge: "Potentially Misleading",
        badgeColor: "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900 dark:text-amber-300 dark:border-amber-700"
      };
    }
    return {
      color: "text-blue-600 dark:text-blue-400",
      bgColor: "bg-blue-50 dark:bg-blue-950/30",
      borderColor: "border-blue-200 dark:border-blue-800",
      icon: <Info className="h-8 w-8 text-blue-500 dark:text-blue-400" />,
      badge: "Needs Review",
      badgeColor: "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900 dark:text-blue-300 dark:border-blue-700"
    };
  };

  const resultConfig = getResultConfig();

  const parseExplanation = (explanation: string) => {
    if (typeof explanation !== "string" || !explanation.trim()) {
      return (
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground text-center py-4">
              No detailed explanation provided.
            </p>
          </CardContent>
        </Card>
      );
    }

    const sections = explanation.split(/(?=### |#### |\d+\.\s+)/).filter(Boolean);
    
    if (sections.length === 0) {
      return (
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground whitespace-pre-line">
              {explanation}
            </p>
          </CardContent>
        </Card>
      );
    }

    return sections.map((section, index) => {
      const cleanSection = section.replace(/^[#\d\.\s]+/, '').trim();
      const lines = cleanSection.split('\n').filter(line => line.trim());
      
      if (lines.length === 0) return null;

      const title = lines[0].replace(/[:：]\s*$/, '');
      const content = lines.slice(1).join('\n');

      return (
        <Card key={index} className="border-l-4 border-l-blue-200 dark:border-l-blue-800 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center">
              <Zap className="h-5 w-5 text-blue-500 dark:text-blue-400 mr-2" />
              {title}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="prose prose-sm max-w-none dark:prose-invert">
              {content.split('- **').map((part, partIndex) => {
                if (partIndex === 0) return <p key={partIndex} className="text-foreground leading-relaxed">{part}</p>;
                
                const boldEnd = part.indexOf('**');
                const boldText = part.substring(0, boldEnd);
                const remainingText = part.substring(boldEnd + 2);
                
                return (
                  <div key={partIndex} className="flex items-start my-3 p-3 bg-muted rounded-lg">
                    <Target className="h-4 w-4 text-green-500 dark:text-green-400 mr-3 mt-1 flex-shrink-0" />
                    <div className="flex-1">
                      <strong className="text-foreground">{boldText}</strong>
                      <span className="text-foreground/80">{remainingText}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      );
    });
  };

  return (
    <div className="space-y-6">
      {/* Tarjeta de resultado principal */}
      <Card className={`border-l-4 ${resultConfig.borderColor} ${resultConfig.bgColor} shadow-lg`}>
        <CardContent className="pt-6">
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-4 flex-1">
              <div className="p-3 bg-background rounded-xl shadow-md">
                {resultConfig.icon}
              </div>
              <div className="flex-1">
                <div className="flex items-center space-x-3 mb-3">
                  <h3 className={`text-2xl font-bold ${resultConfig.color}`}>
                    {final_prediction || "Analysis Complete"}
                  </h3>
                  <Badge className={`${resultConfig.badgeColor} font-semibold`}>
                    {resultConfig.badge}
                  </Badge>
                </div>
                
                <div className="space-y-4">
                  <div className="flex items-center space-x-4">
                    <span className="text-sm font-medium text-muted-foreground min-w-24">
                      Confidence Level:
                    </span>
                    <div className="flex-1 max-w-md">
                      <Progress 
                        value={confidence * 100} 
                        className="h-3 bg-muted"
                      />
                    </div>
                    <span className="ml-3 text-lg font-bold min-w-16 text-foreground">
                      {Math.round(confidence * 100)}%
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Modelos evaluados */}
      {predictions && Object.keys(predictions).length > 0 && (
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center text-xl">
              <BarChart3 className="h-6 w-6 text-blue-500 dark:text-blue-400 mr-2" />
              Model Evaluations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Object.entries(predictions).map(([model, details]: [string, any]) => {
                const accuracy = (details.accuracy ?? 0) * 100;
                
                return (
                  <div
                    key={model}
                    className="flex items-center justify-between p-4 bg-gradient-to-r from-muted/50 to-background rounded-xl border hover:shadow-md transition-all duration-200"
                  >
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h4 className="font-semibold capitalize text-foreground">
                          {model.replace(/_/g, " ")}
                        </h4>
                        <Badge variant="outline" className="text-xs bg-muted">
                          {details.prediction_time}s
                        </Badge>
                      </div>
                      <div className="flex items-center space-x-4">
                        <div className="flex-1 max-w-xs">
                          <Progress value={accuracy} className="h-2 bg-muted" />
                        </div>
                        <span className="text-sm font-semibold min-w-16 text-right text-foreground">
                          {accuracy.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                    <div className="ml-4">
                      <Badge 
                        className={
                          details.prediction?.toLowerCase().includes('real') 
                            ? 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900 dark:text-green-300 dark:border-green-700' 
                            : 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900 dark:text-red-300 dark:border-red-700'
                        }
                      >
                        {details.prediction}
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Explicación mejorada */}
      <Card className="shadow-lg">
        <CardHeader className="bg-gradient-to-r from-muted/50 to-background rounded-t-lg">
          <CardTitle className="flex items-center text-xl">
            <Info className="h-6 w-6 text-blue-500 dark:text-blue-400 mr-2" />
            Detailed Analysis
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="space-y-6">
            {parseExplanation(explanation)}
          </div>
        </CardContent>
      </Card>

      {/* Advertencia */}
      <Card className="bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800 shadow-lg">
        <CardContent className="pt-6">
          <div className="flex items-start space-x-4">
            <AlertTriangle className="h-6 w-6 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
            <div>
              <h4 className="font-semibold text-amber-800 dark:text-amber-400 text-lg">AI Analysis Disclaimer</h4>
              <p className="text-amber-700 dark:text-amber-300 mt-2 leading-relaxed">
                This analysis is provided by an AI system and may not be 100% accurate. 
                Always verify through trusted sources and critical thinking before making 
                important decisions based on this information.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Button 
        onClick={onReset} 
        variant="outline" 
        className="w-full bg-background hover:bg-muted border-2 text-lg py-3 font-semibold shadow-md"
      >
        Analyze Another Content
      </Button>
    </div>
  );
}

function EnhancedDeepfakeResults({ result, onReset }: { result: any; onReset: () => void }) {
  const isAiGenerated = result.final_prediction?.toLowerCase().includes('ai-generated') || 
                       result.raw_result?.type?.ai_generated > 0.5;
  const confidence = result.raw_result?.type?.ai_generated ?? result.confidence ?? 0;
  
  const getStatusConfig = () => {
    if (isAiGenerated) {
      if (confidence > 0.9) {
        return {
          ringColor: 'ring-red-500 dark:ring-red-400',
          textColor: 'text-red-600 dark:text-red-400',
          bgColor: 'bg-red-50 dark:bg-red-950/30',
          borderColor: 'border-red-200 dark:border-red-800',
          statusText: 'AI-Generated Content',
          confidenceText: `High Confidence (${(confidence * 100).toFixed(1)}%)`,
          icon: <ShieldOff className="h-8 w-8 text-red-500 dark:text-red-400" />,
          badge: "AI Generated",
          badgeColor: "bg-red-100 text-red-800 border-red-200 dark:bg-red-900 dark:text-red-300 dark:border-red-700"
        };
      }
      if (confidence > 0.7) {
        return {
          ringColor: 'ring-orange-500 dark:ring-orange-400',
          textColor: 'text-orange-600 dark:text-orange-400',
          bgColor: 'bg-orange-50 dark:bg-orange-950/30',
          borderColor: 'border-orange-200 dark:border-orange-800',
          statusText: 'Likely AI-Generated',
          confidenceText: `Moderate Confidence (${(confidence * 100).toFixed(1)}%)`,
          icon: <ShieldOff className="h-8 w-8 text-orange-500 dark:text-orange-400" />,
          badge: "Likely AI Generated",
          badgeColor: "bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900 dark:text-orange-300 dark:border-orange-700"
        };
      }
      return {
        ringColor: 'ring-yellow-500 dark:ring-yellow-400',
        textColor: 'text-yellow-600 dark:text-yellow-400',
        bgColor: 'bg-yellow-50 dark:bg-yellow-950/30',
        borderColor: 'border-yellow-200 dark:border-yellow-800',
        statusText: 'Possibly AI-Generated',
        confidenceText: `Low Confidence (${(confidence * 100).toFixed(1)}%)`,
        icon: <ShieldOff className="h-8 w-8 text-yellow-500 dark:text-yellow-400" />,
        badge: "Possibly AI Generated",
        badgeColor: "bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900 dark:text-yellow-300 dark:border-yellow-700"
      };
    }
    return {
      ringColor: 'ring-green-500 dark:ring-green-400',
      textColor: 'text-green-600 dark:text-green-400',
      bgColor: 'bg-green-50 dark:bg-green-950/30',
      borderColor: 'border-green-200 dark:border-green-800',
      statusText: 'Authentic Content',
      confidenceText: `High Confidence (${((1 - confidence) * 100).toFixed(1)}%)`,
      icon: <ShieldCheck className="h-8 w-8 text-green-500 dark:text-green-400" />,
      badge: "Authentic Content",
      badgeColor: "bg-green-100 text-green-800 border-green-200 dark:bg-green-900 dark:text-green-300 dark:border-green-700"
    };
  };

  const statusConfig = getStatusConfig();

  return (
    <div className="space-y-6">
      {/* Tarjeta de resultado principal para Deepfake - Mejorada */}
      <Card className={`border-l-4 ${statusConfig.borderColor} ${statusConfig.bgColor} shadow-lg`}>
        <CardContent className="pt-6">
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-4 flex-1">
              <div className="p-3 bg-background rounded-xl shadow-md">
                {statusConfig.icon}
              </div>
              <div className="flex-1">
                <div className="flex items-center space-x-3 mb-3">
                  <h3 className={`text-2xl font-bold ${statusConfig.textColor}`}>
                    {statusConfig.statusText}
                  </h3>
                  <Badge className={`${statusConfig.badgeColor} font-semibold`}>
                    {statusConfig.badge}
                  </Badge>
                </div>
                
                <div className="space-y-4">
                  <div className="flex items-center space-x-4">
                    <span className="text-sm font-medium text-muted-foreground min-w-24">
                      Confidence Level:
                    </span>
                    <div className="flex-1 max-w-md">
                      <Progress 
                        value={isAiGenerated ? confidence * 100 : (1 - confidence) * 100} 
                        className={`h-3 ${isAiGenerated ? 'bg-red-100 dark:bg-red-900/30' : 'bg-green-100 dark:bg-green-900/30'}`}
                      />
                    </div>
                    <span className="ml-3 text-lg font-bold min-w-16 text-foreground">
                      {Math.round(isAiGenerated ? confidence * 100 : (1 - confidence) * 100)}%
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Explicación con el mismo estilo que los otros componentes */}
      {result.explanation && (
        <Card className="shadow-lg">
          <CardHeader className="bg-gradient-to-r from-muted/50 to-background rounded-t-lg">
            <CardTitle className="flex items-center text-xl">
              <Video className="h-6 w-6 text-blue-500 dark:text-blue-400 mr-2" />
              Analysis Details
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="space-y-6">
              {(() => {
                const explanation = result.explanation;
                if (typeof explanation !== "string" || !explanation.trim()) {
                  return (
                    <Card>
                      <CardContent className="pt-6">
                        <p className="text-sm text-muted-foreground text-center py-4">
                          No detailed explanation provided.
                        </p>
                      </CardContent>
                    </Card>
                  );
                }

                const sections = explanation.split(/(?=### |#### |\d+\.\s+)/).filter(Boolean);
                
                if (sections.length === 0) {
                  return (
                    <Card>
                      <CardContent className="pt-6">
                        <p className="text-sm text-muted-foreground whitespace-pre-line">
                          {explanation}
                        </p>
                      </CardContent>
                    </Card>
                  );
                }

                return sections.map((section, index) => {
                  const cleanSection = section.replace(/^[#\d\.\s]+/, '').trim();
                  const lines = cleanSection.split('\n').filter(line => line.trim());
                  
                  if (lines.length === 0) return null;

                  const title = lines[0].replace(/[:：]\s*$/, '');
                  const content = lines.slice(1).join('\n');

                  return (
                    <Card key={index} className="border-l-4 border-l-blue-200 dark:border-l-blue-800 shadow-sm">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-lg flex items-center">
                          <Zap className="h-5 w-5 text-blue-500 dark:text-blue-400 mr-2" />
                          {title}
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="prose prose-sm max-w-none dark:prose-invert">
                          {content.split('- **').map((part, partIndex) => {
                            if (partIndex === 0) return <p key={partIndex} className="text-foreground leading-relaxed">{part}</p>;
                            
                            const boldEnd = part.indexOf('**');
                            const boldText = part.substring(0, boldEnd);
                            const remainingText = part.substring(boldEnd + 2);
                            
                            return (
                              <div key={partIndex} className="flex items-start my-3 p-3 bg-muted rounded-lg">
                                <Target className="h-4 w-4 text-green-500 dark:text-green-400 mr-3 mt-1 flex-shrink-0" />
                                <div className="flex-1">
                                  <strong className="text-foreground">{boldText}</strong>
                                  <span className="text-foreground/80">{remainingText}</span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </CardContent>
                    </Card>
                  );
                });
              })()}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Advertencia con el mismo estilo */}
      <Card className="bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800 shadow-lg">
        <CardContent className="pt-6">
          <div className="flex items-start space-x-4">
            <AlertTriangle className="h-6 w-6 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
            <div>
              <h4 className="font-semibold text-amber-800 dark:text-amber-400 text-lg">Deepfake Detection Notice</h4>
              <p className="text-amber-700 dark:text-amber-300 mt-2 leading-relaxed">
                This AI-based detection may not be 100% accurate. Always verify suspicious 
                content through multiple sources and professional forensic analysis tools.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Button 
        onClick={onReset} 
        variant="outline" 
        className="w-full bg-background hover:bg-muted border-2 text-lg py-3 font-semibold shadow-md"
      >
        Analyze Another Media
      </Button>
    </div>
  );
}

// Tu componente NewsAnalyzer existente con mejoras visuales y modo oscuro
type InputType = "text" | "url" | "image" | "deepfake" | "audio" | "devs";
type AnalysisStatus = "idle" | "loading" | "success" | "error";
type PredictionMode = "default" | "all" | "single";

const MODELS = [
  { code: "logistic", name: "Logistic" },
  { code: "random_forest", name: "Random Forest" },
  { code: "xgboost", name: "XG Boost" },
  { code: "naive_bayes", name: "Naive Bayes" },
  { code: "neural_network", name: "Neural Network" },
];

export function NewsAnalyzer() {
  const [inputType, setInputType] = useState<InputType>("text");
  const [textInput, setTextInput] = useState("");
  const [urlInput, setUrlInput] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [status, setStatus] = useState<AnalysisStatus>("idle");
  const [result, setResult] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadingMessage, setLoadingMessage] = useState<string>("");
  const [predictionMode, setPredictionMode] = useState<PredictionMode>("default");
  const [selectedModel, setSelectedModel] = useState<string>("naive_bayes");
  const [currentMessageIndex, setCurrentMessageIndex] = useState(0);
  const [progress, setProgress] = useState(0);

  const messages = [
    "Extrayendo el contenido...",
    "Procesando datos...",
    "Procesando con Machine learning...",
    "Analizando resultados...",
    "Verificando autenticidad...",
    "Generando respuesta..",
    "Ya casi terminamos...",
    "Casi listo...",
  ];

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setImageFile(e.target.files[0]);
    }
  };

  const handleAudioChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setAudioFile(e.target.files[0]);
    }
  };

  const handleAnalyze = async () => {
    setStatus("loading");
    setError(null);

    try {
      let data;
      console.log("Input type:", inputType);

      const effectiveInputType = inputType === "devs" ? "text" : inputType;

      if (effectiveInputType === "text") {
        if (!textInput.trim()) throw new Error("Please enter some text to analyze");

        if (predictionMode === "all") {
          data = await analyzeNews(textInput, "all");
        } else if (predictionMode === "single") {
          if (!selectedModel) throw new Error("Please select a model");
          data = await analyzeNews(textInput, "single", selectedModel);
        } else {
          data = await analyzeNews(textInput, "default", "logistic");
        }
      } else if (effectiveInputType === "url") {
        if (!urlInput.trim()) throw new Error("Please enter a valid URL");
        data = await analyzeNewsByUrl(urlInput);
      } else if (effectiveInputType === "image") {
        if (!imageFile) throw new Error("Please upload an image");
        data = await analyzeNewsByImage(imageFile);
      } else if (effectiveInputType === "audio") {
        if (!audioFile) throw new Error("Please upload an audio file");
        data = await analyzeNewsByAudio(audioFile);
      } else if (effectiveInputType === "deepfake") {
        if (!imageFile) throw new Error("Please upload an image or video");
        data = await analyzeDeepfake(imageFile); 
      }

      console.log("API Response:", data);
      setResult(data);
      setStatus("success");
    } catch (err) {
      console.error("Error:", err);
      setError(err instanceof Error ? err.message : "An unknown error occurred");
      setStatus("error");
    }
  };

  useEffect(() => {
    const messageInterval = setInterval(() => {
      setCurrentMessageIndex((prev) => (prev + 1) % messages.length);
    }, 3000);

    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          return 0;
        }
        return prev + 1;
      });
    }, 30);

    return () => {
      clearInterval(messageInterval);
      clearInterval(progressInterval);
    };
  }, [messages.length]);

  const resetForm = () => {
    setTextInput("");
    setUrlInput("");
    setImageFile(null);
    setAudioFile(null);
    setResult(null);
    setError(null);
    setStatus("idle");
  };

  useEffect(() => {
    if (status === "loading") {
      const msgs = [
        "Extrayendo el contenido...",
        "Procesando datos...",
        "Procesando con Machine learning...",
        "Analizando resultados...",
        "Verificando autenticidad...",
        "Generando respuesta..",
        "Ya casi terminamos...",
        "Casi listo...",
        "¡Listo!",
      ];
      let index = 0;

      const interval = setInterval(() => {
        setLoadingMessage(msgs[index]);
        index = (index + 1) % msgs.length;
      }, 2500);

      return () => clearInterval(interval);
    }
  }, [status]);

  return (
    <div className="w-full max-w-6xl mx-auto p-4">
      <Card className="shadow-2xl border-2 border-border bg-background">
        <CardHeader className="text-center pb-4">
          <CardTitle className="text-3xl font-bold">
            News Content Analyzer
          </CardTitle>
          <CardDescription className="text-lg text-muted-foreground font-medium">
            Verify news authenticity using advanced AI analysis across multiple formats
          </CardDescription>
        </CardHeader>
        
        <CardContent className="p-6">
          {status === "loading" ? (
            <div className="flex flex-col items-center justify-center p-4">
              <div className="w-full max-w-md rounded-xl shadow-lg overflow-hidden">
                <div className="p-6">
                  <div className="flex justify-center mb-6">
                    <motion.div
                      className="w-10 h-10 border-4 border-yellow-100 border-t-yellow-500 rounded-full"
                      animate={{ rotate: 360 }}
                      transition={{
                        duration: 1,
                        repeat: Number.POSITIVE_INFINITY,
                        ease: "linear",
                      }}
                    />
                  </div>

                  <div className="h-16 flex items-center justify-center">
                    <AnimatePresence mode="wait">
                      <motion.div
                        key={currentMessageIndex}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{
                          duration: 0.5,
                          ease: "easeInOut",
                        }}
                        className="text-center text-gray-700 font-medium"
                      >
                        {messages[currentMessageIndex]}
                      </motion.div>
                    </AnimatePresence>
                  </div>

                  <div className="flex justify-center mt-4 space-x-2">
                    {[0, 1, 2].map((i) => (
                      <motion.div
                        key={i}
                        className="w-2 h-2 bg-yellow-500 rounded-full"
                        animate={{
                          opacity: [0.3, 1, 0.3],
                          scale: [0.8, 1.2, 0.8],
                        }}
                        transition={{
                          duration: 1.5,
                          repeat: Number.POSITIVE_INFINITY,
                          delay: i * 0.2,
                          ease: "easeInOut",
                        }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ) : result ? (
            <EnhancedAnalysisResults result={result} onReset={resetForm} />
          ) : (
            <>
             <Tabs
                defaultValue="general"
                onValueChange={(value) =>
                  setInputType(
                    value === "general" ? "text" : (value as InputType)
                  )
                }
              >
               <TabsList className="grid w-full grid-cols-6 mb-6">
                <TabsTrigger value="general">
                  <FileText className="mr-2 h-4 w-4" />
                  Text
                </TabsTrigger>
                <TabsTrigger value="url">
                  <LinkIcon className="mr-2 h-4 w-4" />
                  URL
                </TabsTrigger>
                <TabsTrigger value="image">
                  <Upload className="mr-2 h-4 w-4" />
                  Image
                </TabsTrigger>
                <TabsTrigger value="audio">
                  <Mic className="mr-2 h-4 w-4" />
                  Audio
                </TabsTrigger>
                <TabsTrigger value="deepfake">
                  <ScanFace className="mr-2 h-4 w-4" />
                  Deepfake
                </TabsTrigger>
                
                <TabsTrigger value="devs">
                  <Terminal className="mr-2 h-4 w-4" />
                  For Devs
                </TabsTrigger>
              </TabsList>

                {/* General Mode */}
                <TabsContent value="general">
                  <Label className="my-3" htmlFor="text-input">
                    Paste news article text
                  </Label>
                  <Textarea
                    id="text-input"
                    placeholder="Paste the full text of the news article here..."
                    className="min-h-[200px]"
                    value={textInput}
                    onChange={(e) => setTextInput(e.target.value)}
                  />
                </TabsContent>

                {/* For Devs Mode */}
                <TabsContent value="devs">
                  <div>
                    <Label className="my-3" htmlFor="text-input">
                      Prediction Mode
                    </Label>
                    <div className="flex space-x-2 mt-2">
                      <Button
                        variant={
                          predictionMode === "all" ? "default" : "outline"
                        }
                        size="sm"
                        onClick={() => setPredictionMode("all")}
                      >
                        All Models
                      </Button>
                      <Button
                        variant={
                          predictionMode === "single" ? "default" : "outline"
                        }
                        size="sm"
                        onClick={() => setPredictionMode("single")}
                      >
                        Custom Model
                      </Button>
                    </div>
                  </div>

                  {predictionMode === "single" && (
                    <div className="mt-4">
                      <Label className="mb-3">Select Model</Label>
                      <select
                        value={selectedModel}
                        onChange={(e) => setSelectedModel(e.target.value)}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      >
                        {MODELS.map((model) => (
                          <option key={model.code} value={model.code}>
                            {model.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <Label className="my-3" htmlFor="text-input">
                    Paste news article text
                  </Label>
                  <Textarea
                    id="text-input"
                    placeholder="Paste the full text of the news article here..."
                    className="min-h-[200px]"
                    value={textInput}
                    onChange={(e) => setTextInput(e.target.value)}
                  />
                </TabsContent>

                <TabsContent value="url">
                  <div className="space-y-4">
                    <Label htmlFor="url-input">Enter news article URL</Label>
                    <Input
                      id="url-input"
                      type="url"
                      placeholder="https://noticias.com/nota"
                      value={urlInput}
                      onChange={(e) => setUrlInput(e.target.value)}
                    />
                  </div>
                </TabsContent>

                <TabsContent value="image">
                  <div className="space-y-4">
                    <Label htmlFor="image-input">
                      Upload screenshot of news article
                    </Label>
                    <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center">
                      <Input
                        id="image-input"
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          if (e.target.files && e.target.files[0]) {
                            console.log("Selected file:", e.target.files[0]);
                            setImageFile(e.target.files[0]);
                          }
                        }}
                      />
                      <Label
                        htmlFor="image-input"
                        className="flex flex-col items-center justify-center cursor-pointer"
                      >
                        <Upload className="h-10 w-10 text-muted-foreground mb-2" />
                        <span className="text-sm font-medium">
                          {imageFile
                            ? imageFile.name
                            : "Click to upload or drag and drop"}
                        </span>
                        <span className="text-xs text-muted-foreground mt-1">
                          PNG, JPG up to 10MB
                        </span>
                      </Label>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="audio">
                  <div className="space-y-4">
                    <Label htmlFor="audio-input">Sube un archivo de audio</Label>
                    <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center">
                      <Input
                        id="audio-input"
                        type="file"
                        accept="audio/*"
                        onChange={handleAudioChange}
                      />
                      <p className="text-sm text-muted-foreground mt-2">
                        Formatos soportados: .mp3, .wav, .m4a (máx 20 MB)
                      </p>
                    </div>
                  </div>
                </TabsContent>
                <TabsContent value="deepfake">
                  <div className="space-y-4">
                    <Label htmlFor="deepfake-input">
                      Upload an image or video to detect if it's AI-generated
                    </Label>
                    <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center">
                      <Input
                        id="deepfake-input"
                        type="file"
                        accept="image/*,video/*"
                        className="hidden"
                        onChange={(e) => {
                          if (e.target.files && e.target.files[0]) {
                            console.log("Selected deepfake file:", e.target.files[0]);
                            setImageFile(e.target.files[0]); // usamos el mismo state imageFile
                          }
                        }}
                      />
                      <Label
                        htmlFor="deepfake-input"
                        className="flex flex-col items-center justify-center cursor-pointer"
                      >
                        <Upload className="h-10 w-10 text-muted-foreground mb-2" />
                        <span className="text-sm font-medium">
                          {imageFile
                            ? imageFile.name
                            : "Click to upload or drag and drop"}
                        </span>
                        <span className="text-xs text-muted-foreground mt-1">
                          MP4, MOV, JPG, PNG (max 20 MB)
                        </span>
                      </Label>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>

              {error && (
                <Card className="bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800 mt-6 shadow-lg">
                  <CardContent className="pt-6">
                    <div className="flex items-center space-x-4">
                      <AlertTriangle className="h-8 w-8 text-red-600 dark:text-red-400 flex-shrink-0" />
                      <div>
                        <h4 className="font-semibold text-red-800 dark:text-red-400 text-lg">Analysis Error</h4>
                        <p className="text-red-700 dark:text-red-300 mt-1">{error}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </CardContent>
        
        <CardFooter className="flex justify-end space-x-3">
          {result ? (
            <Button
              onClick={resetForm}
              variant="outline"
              className="w-full sm:w-auto"
            >
              Analyze Other
            </Button>
          ) : (
            <Button
              onClick={handleAnalyze}
              disabled={status === "loading"}
              className="w-full sm:w-auto"
            >
              {status === "loading" ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                "Analyze Content"
              )}
            </Button>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}
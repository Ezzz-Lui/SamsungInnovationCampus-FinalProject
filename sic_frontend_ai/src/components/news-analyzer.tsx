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
          confidenceText: `High Confidence (${(confidence * 100).toFixed(1)}%)`
        };
      }
      if (confidence > 0.7) {
        return {
          ringColor: 'ring-orange-500 dark:ring-orange-400',
          textColor: 'text-orange-600 dark:text-orange-400',
          bgColor: 'bg-orange-50 dark:bg-orange-950/30',
          borderColor: 'border-orange-200 dark:border-orange-800',
          statusText: 'Likely AI-Generated',
          confidenceText: `Moderate Confidence (${(confidence * 100).toFixed(1)}%)`
        };
      }
      return {
        ringColor: 'ring-yellow-500 dark:ring-yellow-400',
        textColor: 'text-yellow-600 dark:text-yellow-400',
        bgColor: 'bg-yellow-50 dark:bg-yellow-950/30',
        borderColor: 'border-yellow-200 dark:border-yellow-800',
        statusText: 'Possibly AI-Generated',
        confidenceText: `Low Confidence (${(confidence * 100).toFixed(1)}%)`
      };
    }
    return {
      ringColor: 'ring-green-500 dark:ring-green-400',
      textColor: 'text-green-600 dark:text-green-400',
      bgColor: 'bg-green-50 dark:bg-green-950/30',
      borderColor: 'border-green-200 dark:border-green-800',
      statusText: 'Authentic Content',
      confidenceText: `High Confidence (${((1 - confidence) * 100).toFixed(1)}%)`
    };
  };

  const statusConfig = getStatusConfig();

  return (
    <div className="space-y-6">
      <Card className={`border-l-4 ${statusConfig.borderColor} ${statusConfig.bgColor} shadow-xl`}>
        <CardContent className="pt-8">
          <div className="flex flex-col items-center text-center p-4">
            <div className={`relative w-40 h-40 mb-6`}>
              <div className={`absolute inset-0 rounded-full ring-4 ${statusConfig.ringColor} ring-offset-4 dark:ring-offset-background animate-pulse`}></div>
              {isAiGenerated ? (
                <ShieldOff className={`w-full h-full ${statusConfig.textColor}`} />
              ) : (
                <ShieldCheck className={`w-full h-full ${statusConfig.textColor}`} />
              )}
            </div>
            
            <h2 className={`text-3xl font-bold ${statusConfig.textColor} mb-2`}>
              {statusConfig.statusText}
            </h2>
            
            <p className="text-lg text-muted-foreground mb-6">
              {statusConfig.confidenceText}
            </p>
            
            <div className="w-full max-w-md">
              <div className="flex justify-between text-sm text-muted-foreground mb-2">
                <span className="font-semibold">Authentic</span>
                <span className="font-semibold">AI-Generated</span>
              </div>
              <Progress 
                value={isAiGenerated ? confidence * 100 : (1 - confidence) * 100} 
                className={`h-4 ${isAiGenerated ? 'bg-red-100 dark:bg-red-900/30' : 'bg-green-100 dark:bg-green-900/30'} shadow-inner`}
              />
              <div className="flex justify-between text-xs text-muted-foreground mt-1">
                <span>0%</span>
                <span>50%</span>
                <span>100%</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {result.explanation && (
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center text-xl">
              <Video className="h-6 w-6 text-blue-500 dark:text-blue-400 mr-2" />
              Analysis Details
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-muted rounded-xl p-6">
              <p className="text-foreground leading-relaxed whitespace-pre-wrap">
                {result.explanation}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

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
      setProgress((prev) => (prev >= 100 ? 0 : prev + 1));
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
            <div className="flex flex-col items-center justify-center p-8">
              <div className="w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-950/30 dark:to-purple-950/30 border-2 border-blue-200 dark:border-blue-800">
                <div className="p-12">
                  <div className="flex justify-center mb-8">
                    <motion.div
                      className="w-20 h-20 border-4 border-blue-200 dark:border-blue-800 border-t-blue-600 dark:border-t-blue-400 rounded-full"
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    />
                  </div>

                  <div className="h-24 flex items-center justify-center mb-6">
                    <AnimatePresence mode="wait">
                      <motion.div
                        key={currentMessageIndex}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.5, ease: "easeInOut" }}
                        className="text-center text-foreground font-semibold text-xl"
                      >
                        {messages[currentMessageIndex]}
                      </motion.div>
                    </AnimatePresence>
                  </div>

                  <div className="flex justify-center space-x-3">
                    {[0, 1, 2, 3, 4].map((i) => (
                      <motion.div
                        key={i}
                        className="w-3 h-3 bg-blue-500 dark:bg-blue-400 rounded-full"
                        animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1.2, 0.8] }}
                        transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.1 }}
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
             

                <TabsContent value="devs" className="space-y-6 animate-in fade-in duration-300">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <Label className="text-lg font-semibold text-foreground">Prediction Mode</Label>
                      <div className="flex space-x-3">
                        <Button
                          variant={predictionMode === "all" ? "default" : "outline"}
                          size="lg"
                          onClick={() => setPredictionMode("all")}
                          className="flex-1 border-2"
                        >
                          All Models
                        </Button>
                        <Button
                          variant={predictionMode === "single" ? "default" : "outline"}
                          size="lg"
                          onClick={() => setPredictionMode("single")}
                          className="flex-1 border-2"
                        >
                          Custom Model
                        </Button>
                      </div>
                    </div>

                    {predictionMode === "single" && (
                      <div className="space-y-4">
                        <Label className="text-lg font-semibold text-foreground">Select Model</Label>
                        <select
                          value={selectedModel}
                          onChange={(e) => setSelectedModel(e.target.value)}
                          className="flex h-14 w-full rounded-2xl border-2 border-border bg-background px-4 py-2 text-lg focus:border-blue-500 dark:focus:border-blue-400 transition-all duration-200 shadow-sm"
                        >
                          {MODELS.map((model) => (
                            <option key={model.code} value={model.code}>
                              {model.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>

                  <Label className="text-lg font-semibold text-foreground" htmlFor="text-input">
                    Paste News Article Text
                  </Label>
                  <Textarea
                    id="text-input"
                    placeholder="Paste the full text of the news article here for analysis..."
                    className="min-h-[200px] text-lg p-6 border-2 border-border rounded-2xl focus:border-blue-500 dark:focus:border-blue-400 transition-all duration-200 resize-none shadow-sm"
                    value={textInput}
                    onChange={(e) => setTextInput(e.target.value)}
                  />
                </TabsContent>

                <TabsContent value="url" className="space-y-4 animate-in fade-in duration-300">
                  <Label htmlFor="url-input" className="text-lg font-semibold text-foreground">Enter News Article URL</Label>
                  <Input
                    id="url-input"
                    type="url"
                    placeholder="https://example.com/news-article"
                    className="h-14 text-lg px-4 border-2 border-border rounded-2xl focus:border-green-500 dark:focus:border-green-400 transition-all duration-200 shadow-sm"
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                  />
                </TabsContent>

                <TabsContent value="image" className="space-y-4 animate-in fade-in duration-300">
                  <Label htmlFor="image-input" className="text-lg font-semibold text-foreground">
                    Upload Screenshot of News Article
                  </Label>
                  <div className="border-3 border-dashed border-amber-300 dark:border-amber-600 rounded-2xl p-8 text-center bg-amber-50 dark:bg-amber-950/30 hover:bg-amber-100 dark:hover:bg-amber-900/40 transition-all duration-300 group">
                    <Input
                      id="image-input"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleFileChange}
                    />
                    <Label
                      htmlFor="image-input"
                      className="flex flex-col items-center justify-center cursor-pointer"
                    >
                      <Upload className="h-16 w-16 text-amber-500 dark:text-amber-400 mb-4 group-hover:scale-110 transition-transform duration-200" />
                      <span className="text-xl font-semibold text-foreground">
                        {imageFile ? imageFile.name : "Click to upload or drag and drop"}
                      </span>
                      <span className="text-sm text-muted-foreground mt-2">
                        Supports: PNG, JPG, JPEG (max 10MB)
                      </span>
                    </Label>
                  </div>
                </TabsContent>

                <TabsContent value="audio" className="space-y-4 animate-in fade-in duration-300">
                  <Label htmlFor="audio-input" className="text-lg font-semibold text-foreground">Upload Audio File</Label>
                  <div className="border-3 border-dashed border-emerald-300 dark:border-emerald-600 rounded-2xl p-8 text-center bg-emerald-50 dark:bg-emerald-950/30 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition-all duration-300 group">
                    <Input
                      id="audio-input"
                      type="file"
                      accept="audio/*"
                      onChange={handleAudioChange}
                      className="hidden"
                    />
                    <Label
                      htmlFor="audio-input"
                      className="flex flex-col items-center justify-center cursor-pointer"
                    >
                      <Mic className="h-16 w-16 text-emerald-500 dark:text-emerald-400 mb-4 group-hover:scale-110 transition-transform duration-200" />
                      <span className="text-xl font-semibold text-foreground">
                        {audioFile ? audioFile.name : "Click to upload audio file"}
                      </span>
                      <span className="text-sm text-muted-foreground mt-2">
                        Supported formats: MP3, WAV, M4A (max 20MB)
                      </span>
                    </Label>
                  </div>
                </TabsContent>

                <TabsContent value="deepfake" className="space-y-4 animate-in fade-in duration-300">
                  <Label htmlFor="deepfake-input" className="text-lg font-semibold text-foreground">
                    Upload Image or Video for Deepfake Detection
                  </Label>
                  <div className="border-3 border-dashed border-purple-300 dark:border-purple-600 rounded-2xl p-8 text-center bg-purple-50 dark:bg-purple-950/30 hover:bg-purple-100 dark:hover:bg-purple-900/40 transition-all duration-300 group">
                    <Input
                      id="deepfake-input"
                      type="file"
                      accept="image/*,video/*"
                      className="hidden"
                      onChange={handleFileChange}
                    />
                    <Label
                      htmlFor="deepfake-input"
                      className="flex flex-col items-center justify-center cursor-pointer"
                    >
                      <ScanFace className="h-16 w-16 text-purple-500 dark:text-purple-400 mb-4 group-hover:scale-110 transition-transform duration-200" />
                      <span className="text-xl font-semibold text-foreground">
                        {imageFile ? imageFile.name : "Click to upload or drag and drop"}
                      </span>
                      <span className="text-sm text-muted-foreground mt-2">
                        Supports: MP4, MOV, JPG, PNG (max 20MB)
                      </span>
                    </Label>
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
        
        <CardFooter className="flex justify-end space-x-4 p-6 bg-muted rounded-b-2xl">
          {!result && (
            <Button
              onClick={handleAnalyze}
              disabled={status === "loading"}
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 dark:from-blue-500 dark:to-purple-500 dark:hover:from-blue-600 dark:hover:to-purple-600 text-white text-lg py-4 px-10 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-200 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              size="lg"
            >
              {status === "loading" ? (
                <>
                  <Loader2 className="mr-3 h-5 w-5 animate-spin" />
                  Analyzing Content...
                </>
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
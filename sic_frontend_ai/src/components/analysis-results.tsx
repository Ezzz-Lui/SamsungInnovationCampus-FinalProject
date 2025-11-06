import { AlertTriangle, CheckCircle, Info, Video } from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface PredictionDetails {
  accuracy?: number;
  prediction: string;
  prediction_time?: number;
}

interface AnalysisResultProps {
  result: any; // puede venir de modelo textual o Sightengine
  onReset: () => void;
}

export function AnalysisResults({ result, onReset }: AnalysisResultProps) {
  if (!result) {
    return (
      <div className="text-center text-muted-foreground">
        No analysis results available.
      </div>
    );
  }

  // --- Detectar si el resultado viene de Sightengine (deepfake) ---
  const isDeepfake =
    result?.media?.type === "image" ||
    result?.media?.type === "video" ||
    result?.type?.ai_generated !== undefined;

  // --- Modo Deepfake / IA Generada ---
  if (isDeepfake) {
    const aiProb = result.type?.ai_generated ?? 0;
    const fakeDetected = aiProb > 0.5;
    const mediaType = result.media?.type || "unknown";
    const confidence = (aiProb * 100).toFixed(2);

    return (
      <div className="space-y-6 text-center">
        <div className="flex flex-col items-center space-y-3">
          <Video className="h-10 w-10 text-blue-500" />
          <h3 className="text-xl font-bold">Deepfake Detection Result</h3>
          <p
            className={`text-2xl font-bold ${
              fakeDetected ? "text-red-500" : "text-green-600"
            }`}
          >
            {fakeDetected
              ? `AI-generated content detected (${confidence}%)`
              : `Appears to be Real (${(100 - aiProb * 100).toFixed(2)}%)`}
          </p>
        </div>

        <div className="p-4 bg-muted rounded-lg">
          <h4 className="font-medium">API Details</h4>
          <p className="text-sm text-muted-foreground">
            Media Type: <strong>{mediaType}</strong>
          </p>
          <p className="text-sm text-muted-foreground">
            Status: {result.status || "unknown"}
          </p>
        </div>

        <div className="mt-6 p-4 bg-yellow-50 rounded-lg border border-yellow-300 text-yellow-800">
          <AlertTriangle className="inline h-5 w-5 mr-1" />
          This result is AI-based and may not be fully accurate. Always verify
          with additional forensic tools.
        </div>
      </div>
    );
  }

  // --- Si no es Deepfake, asumimos análisis de texto ---
  const analysisData = result.result || result;
  const {
    final_prediction = "",
    explanation = "",
    predictions,
    confidence = 0,
  } = analysisData;

  const getResultColor = () => {
    const pred = final_prediction.toLowerCase();
    if (pred.includes("real") || pred.includes("true")) return "text-green-500";
    if (pred.includes("misleading")) return "text-amber-500";
    if (pred.includes("fake") || pred.includes("false")) return "text-red-500";
    return "text-blue-500";
  };

  const getResultIcon = () => {
    const pred = final_prediction.toLowerCase();
    if (pred.includes("real") || pred.includes("true"))
      return <CheckCircle className="h-8 w-8 text-green-500" />;
    if (pred.includes("misleading"))
      return <AlertTriangle className="h-8 w-8 text-amber-500" />;
    if (pred.includes("fake") || pred.includes("false"))
      return <AlertTriangle className="h-8 w-8 text-red-500" />;
    return <Info className="h-8 w-8 text-blue-500" />;
  };

  const parseExplanation = (explanation: string) => {
    if (typeof explanation !== "string" || !explanation.trim()) {
      return (
        <p className="text-sm text-muted-foreground">
          No explanation provided.
        </p>
      );
    }

    const sections = explanation.split(/\d+\.\s+/).filter(Boolean);
    if (sections.length === 0) {
      return (
        <p className="text-sm text-muted-foreground whitespace-pre-line">
          {explanation}
        </p>
      );
    }

    return sections.map((section, index) => (
      <div key={index} className="space-y-2">
        <h4 className="font-medium">
          {["Text Analysis", "Reasoning", "Key Factors"][index] ||
            `Section ${index + 1}`}
        </h4>
        <p className="text-sm text-muted-foreground">{section.trim()}</p>
      </div>
    ));
  };

  // --- Render principal (análisis textual) ---
  return (
    <div className="space-y-6">
      {/* Resultado principal */}
      <div className="flex items-center space-x-4">
        {getResultIcon()}
        <div>
          <h3 className={`text-xl font-bold ${getResultColor()}`}>
            {final_prediction
              ? `Potentially ${final_prediction}`
              : "Analysis Result"}
          </h3>
          <div className="flex items-center mt-1">
            <span className="text-sm text-muted-foreground mr-2">
              Confidence:
            </span>
            <Progress value={confidence * 100} className="h-2 w-24" />
            <span className="ml-2 text-sm">{Math.round(confidence * 100)}%</span>
          </div>
        </div>
      </div>

      {/* Modelos evaluados */}
      {predictions && (
        <div>
          <h4 className="font-medium mb-2">Model Evaluations:</h4>
          <div className="space-y-4">
            {Object.entries(predictions).map(([model, details]) => {
              const d = details as PredictionDetails;
              return (
                <div
                  key={model}
                  className="flex items-center justify-between p-3 bg-muted rounded-lg"
                >
                  <div>
                    <h4 className="font-medium capitalize">
                      {model.replace(/_/g, " ")}
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      Accuracy: {(d.accuracy ?? 0).toFixed(2)}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Time: {d.prediction_time}s
                    </p>
                  </div>
                  <div className="flex items-center">
                    <Progress
                      value={(d.accuracy ?? 0) * 100}
                      className="h-2 w-24"
                    />
                    <span className="ml-2 text-sm">{d.prediction}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Explicación */}
      <div className="space-y-4">
        <h4 className="font-medium">Analysis Explanation:</h4>
        {parseExplanation(explanation)}
      </div>

      {/* Advertencia */}
      <div className="mt-8 p-4 bg-muted rounded-lg">
        <div className="flex items-start space-x-2">
          <AlertTriangle className="h-5 w-5 text-yellow-500 mt-0.5" />
          <div>
            <h4 className="font-medium">AI Analysis Disclaimer</h4>
            <p className="text-sm text-muted-foreground">
              This analysis is provided by an AI system and may not be 100%
              accurate. Always verify through trusted sources before making
              decisions.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

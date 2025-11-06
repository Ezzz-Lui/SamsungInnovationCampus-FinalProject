import os
import tempfile
import requests
from rest_framework import status, views
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.response import Response
from faster_whisper import WhisperModel

# Carga perezosa del modelo
_WHISPER = None
def _whisper():
    global _WHISPER
    if _WHISPER is None:
        model_name = os.getenv("WHISPER_MODEL", "base")  # tiny|base|small|...
        _WHISPER = WhisperModel(model_name, device="cpu", compute_type="int8")
    return _WHISPER

class AnalyzeAudioWhisperView(views.APIView):
    parser_classes = (MultiPartParser, FormParser)

    def post(self, request, *args, **kwargs):
        audio = request.FILES.get("audio")
        if not audio:
            return Response({"detail": "Falta el campo 'audio'."}, status=status.HTTP_400_BAD_REQUEST)
        if audio.size > 20 * 1024 * 1024:
            return Response({"detail": "Archivo demasiado grande (máx 20MB)."}, status=status.HTTP_400_BAD_REQUEST)

        tmp_path = None
        try:
            # Guardar a archivo temporal
            with tempfile.NamedTemporaryFile(delete=False, suffix=os.path.splitext(audio.name)[1]) as tmp:
                for chunk in audio.chunks():
                    tmp.write(chunk)
                tmp_path = tmp.name

            # Transcribir
            segments, info = _whisper().transcribe(tmp_path)  # language="es" si quieres forzar español
            transcript = " ".join(s.text.strip() for s in segments).strip()
            if not transcript:
                return Response({"detail": "Transcripción vacía."}, status=status.HTTP_400_BAD_REQUEST)

            # Reusar el endpoint de TEXTO que ya existe
            backend_base = "http://127.0.0.1:8000"
            predict_url  = f"{backend_base}/api/predict/v1/api/ai/default"
            r = requests.post(predict_url, json={"text": transcript}, timeout=60)
            r.raise_for_status()
            pred = r.json()

            # IMPORTANTE: devolver el MISMO formato que espera el frontend
            # (top-level: final_prediction, explanation, predictions?, confidence?)
            pred_out = {
                "final_prediction": pred.get("final_prediction", ""),
                "explanation": pred.get("explanation", ""),
                "predictions": pred.get("predictions"),
                "confidence": pred.get("confidence"),
                # Campo extra (no rompe el frontend):
                "transcript": transcript,
                "engine": f"whisper-{os.getenv('WHISPER_MODEL','base')}",
                "language": getattr(info, "language", None),
            }
            return Response(pred_out, status=status.HTTP_200_OK)

        except Exception as ex:
            return Response({"detail": f"Error procesando el audio: {ex}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        finally:
            if tmp_path and os.path.exists(tmp_path):
                try: os.remove(tmp_path)
                except Exception: pass

"use client";
import React, { useState } from "react";
import { analyzeNewsByAudio } from "@/lib/api";

export default function AudioPage() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setResult(null);
    if (!file) { setError("Selecciona un archivo de audio."); return; }

    try {
      setLoading(true);
      const data = await analyzeNewsByAudio(file);
      setResult(data);
    } catch (err: any) {
      setError(err.message || "Error realizando la petición.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto p-6 space-y-4">
      <h1 className="text-2xl font-bold">Subir audio y verificar</h1>

      <form onSubmit={onSubmit} className="space-y-3">
        <input type="file" accept="audio/*" onChange={(e) => setFile(e.target.files?.[0] || null)} />
        <button type="submit" disabled={loading || !file}
          className="px-4 py-2 rounded bg-black text-white disabled:opacity-50">
          {loading ? "Procesando..." : "Analizar audio"}
        </button>
      </form>

      {error && <div className="p-3 bg-red-100 text-red-700 rounded">{error}</div>}

      {result && (
        <div className="p-4 bg-gray-100 rounded space-y-2">
          <div><span className="font-semibold">Engine:</span> {result.engine}</div>
          {result.language && <div><span className="font-semibold">Idioma:</span> {result.language}</div>}
          <div><span className="font-semibold">Transcripción:</span> {result.transcript}</div>
          <div>
            <span className="font-semibold">Predicción:</span>
            <pre className="text-sm whitespace-pre-wrap">{JSON.stringify(result.prediction, null, 2)}</pre>
          </div>
        </div>
      )}
    </div>
  );
}

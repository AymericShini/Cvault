"use client";
import { useCallback, useState } from "react";
import { uploadCV } from "@/lib/api";
import type { LlmStats, ParsedCV } from "@/lib/types";
import DropZone from "@/components/upload/DropZone";
import ProcessingPanel from "@/components/upload/ProcessingPanel";
import ResultPreview from "@/components/upload/ResultPreview";
import styles from "./page.module.css";

type Stage = "idle" | "processing" | "result";

interface Job {
  id: string;
  filename: string;
  chars: number;
}

export default function UploadPage() {
  const [stage, setStage] = useState<Stage>("idle");
  const [job, setJob] = useState<Job | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<ParsedCV | null>(null);
  const [llmStats, setLlmStats] = useState<LlmStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFile = useCallback(async (f: File) => {
    setError(null);
    setFile(f);
    setStage("processing");
    try {
      const res = await uploadCV(f);
      setJob({
        id: res.job_id,
        filename: res.filename,
        chars: res.chars_extracted,
      });
    } catch (err) {
      setError((err as Error).message);
      setStage("idle");
    }
  }, []);

  const handleComplete = useCallback((parsed: ParsedCV, stats: LlmStats) => {
    setResult(parsed);
    setLlmStats(stats);
    setStage("result");
  }, []);

  const handleError = useCallback((msg: string) => {
    setError(msg);
    setStage("idle");
    setJob(null);
  }, []);

  const reset = useCallback(() => {
    setStage("idle");
    setJob(null);
    setFile(null);
    setResult(null);
    setLlmStats(null);
    setError(null);
  }, []);

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1>Upload CV</h1>
        <p className={styles.sub}>
          Drop a PDF — watch the AI pipeline parse it in real-time.
        </p>
      </header>

      <div className={styles.body}>
        {stage === "idle" && (
          <>
            <DropZone onFile={handleFile} />
            {error && <div className={styles.errorBanner}>{error}</div>}
            <div className={styles.hint}>
              <span className={styles.hintLabel}>
                Phase 1 — Context Engineering
              </span>
              Each parse call sends a carefully engineered prompt to Groq. The
              processing panel below will show you exactly what is sent.
            </div>
          </>
        )}

        {stage === "processing" && job && (
          <ProcessingPanel
            jobId={job.id}
            filename={job.filename}
            onComplete={handleComplete}
            onError={handleError}
          />
        )}

        {stage === "result" && result && job && file && (
          <ResultPreview
            result={result}
            filename={job.filename}
            file={file}
            onReset={reset}
            llmStats={llmStats ?? undefined}
          />
        )}
      </div>
    </div>
  );
}

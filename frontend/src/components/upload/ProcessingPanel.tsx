'use client'
import { useEffect, useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import { getStreamUrl } from '@/lib/api'
import type { LlmStats, ParsedCV, ProcessingStep, SSEEvent, StepStatus } from '@/lib/types'
import styles from './ProcessingPanel.module.css'

interface Props {
  jobId: string
  filename: string
  onComplete: (result: ParsedCV, stats: LlmStats) => void
  onError: (msg: string) => void
}

export default function ProcessingPanel({ jobId, filename, onComplete, onError }: Props) {
  const t = useTranslations('processing')

  const STEP_LABELS: Record<string, string> = {
    extract:  t('stepExtract'),
    prompt:   t('stepPrompt'),
    llm:      t('stepLlm'),
    validate: t('stepValidate'),
    complete: t('stepDone'),
  }

  function makeInitialSteps(): ProcessingStep[] {
    return ['extract', 'prompt', 'llm', 'validate'].map((id) => ({
      id,
      label: STEP_LABELS[id],
      status: 'pending',
      detail: '',
    }))
  }

  const [steps, setSteps] = useState<ProcessingStep[]>(makeInitialSteps)
  const [promptPreview, setPromptPreview] = useState<string | null>(null)
  const [showPrompt, setShowPrompt] = useState(false)
  const esRef = useRef<EventSource | null>(null)

  useEffect(() => {
    const es = new EventSource(getStreamUrl(jobId))
    esRef.current = es

    es.onmessage = (event: MessageEvent) => {
      const data: SSEEvent = JSON.parse(event.data)

      if (data.step === 'complete') {
        es.close()
        setSteps((prev) => prev.map((s) => ({ ...s, status: 'done' })))
        if (data.result) onComplete(data.result, {
          tokens_used: data.tokens_used ?? 0,
          latency_ms: data.latency_ms ?? 0,
          model: data.model ?? '',
        })
        return
      }

      if (data.step === 'error') {
        es.close()
        setSteps((prev) =>
          prev.map((s) => (s.status === 'running' ? { ...s, status: 'error', detail: data.detail } : s))
        )
        onError(data.detail)
        return
      }

      if (data.prompt_preview) setPromptPreview(data.prompt_preview)

      setSteps((prev) =>
        prev.map((s) => {
          if (s.id !== data.step) return s
          return {
            ...s,
            status: data.status as StepStatus,
            detail: data.detail,
            duration_ms: data.duration_ms,
          }
        })
      )
    }

    es.onerror = () => {
      es.close()
      onError(t('connectionError'))
    }

    return () => es.close()
  }, [jobId, onComplete, onError, t])

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <span className={styles.filename}>{filename}</span>
        <span className={styles.live}>{t('live')}</span>
      </div>

      <div className={styles.steps}>
        {steps.map((step) => (
          <div key={step.id} className={`${styles.step} ${styles[step.status]}`}>
            <span className={styles.icon}>
              {step.status === 'pending'  && <Dot />}
              {step.status === 'running'  && <Spinner />}
              {step.status === 'done'     && <Check />}
              {step.status === 'error'    && <Cross />}
            </span>
            <span className={styles.label}>{step.label}</span>
            {step.detail && (
              <span className={styles.detail}>{step.detail}</span>
            )}
          </div>
        ))}
      </div>

      {promptPreview && (
        <div className={styles.promptSection}>
          <button
            className={styles.promptToggle}
            onClick={() => setShowPrompt((v) => !v)}
          >
            {showPrompt ? '▾' : '▸'} {t('promptToggle')}
          </button>
          {showPrompt && (
            <pre className={styles.promptBox}>{promptPreview}</pre>
          )}
        </div>
      )}
    </div>
  )
}

function Dot() {
  return <span className={styles.dot} />
}
function Spinner() {
  return (
    <svg className={styles.spinner} width="14" height="14" viewBox="0 0 14 14">
      <circle cx="7" cy="7" r="5" fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray="20 12" />
    </svg>
  )
}
function Check() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2.5">
      <polyline points="2,7 5.5,10.5 12,3.5" />
    </svg>
  )
}
function Cross() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2.5">
      <line x1="3" y1="3" x2="11" y2="11"/><line x1="11" y1="3" x2="3" y2="11"/>
    </svg>
  )
}

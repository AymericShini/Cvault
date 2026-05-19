'use client'
import { useEffect, useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import { getAgentHistory, getAgentRun, getAgentRunUrl } from '@/lib/api'
import type { AgentEvent, AgentRunListItem } from '@/lib/types'
import styles from './page.module.css'

export default function AgentPage() {
  const t = useTranslations('agent')
  const [task, setTask] = useState('')
  const [steps, setSteps] = useState<AgentEvent[]>([])
  const [running, setRunning] = useState(false)
  const [history, setHistory] = useState<AgentRunListItem[]>([])
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null)
  const traceEndRef = useRef<HTMLDivElement>(null)

  const EXAMPLES = [
    t('example1'),
    t('example2'),
    t('example3'),
    t('example4'),
  ]

  useEffect(() => {
    getAgentHistory().then(setHistory).catch(() => {})
  }, [])

  async function handleRun(e: React.FormEvent) {
    e.preventDefault()
    if (!task.trim() || running) return

    setSteps([])
    setSelectedRunId(null)
    setRunning(true)

    try {
      const res = await fetch(getAgentRunUrl(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ task: task.trim() }),
      })

      if (!res.ok || !res.body) {
        const err = await res.json().catch(() => ({ detail: 'Request failed' }))
        setSteps([{ type: 'error', content: err.detail ?? 'Request failed' }])
        return
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      try {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          buffer += decoder.decode(value, { stream: true })
          const parts = buffer.split('\n\n')
          buffer = parts.pop() ?? ''

          for (const part of parts) {
            const trimmed = part.trim()
            if (!trimmed.startsWith('data: ')) continue
            try {
              const event: AgentEvent = JSON.parse(trimmed.slice(6))
              setSteps((prev) => [...prev, event])
              traceEndRef.current?.scrollIntoView({ behavior: 'smooth' })
            } catch {
              // skip malformed events
            }
          }
        }
      } finally {
        reader.releaseLock()
      }
    } catch (err: unknown) {
      setSteps((prev) => [
        ...prev,
        { type: 'error', content: err instanceof Error ? err.message : 'Network error' },
      ])
    } finally {
      setRunning(false)
      getAgentHistory().then(setHistory).catch(() => {})
    }
  }

  async function handleSelectRun(runId: string) {
    if (running) return
    setSelectedRunId(runId)
    try {
      const detail = await getAgentRun(runId)
      setSteps(detail.events)
      setTask(detail.task)
    } catch {
      // non-fatal
    }
  }

  return (
    <main className={styles.page}>
      {/* ── History sidebar ── */}
      <aside className={styles.historySidebar}>
        <p className={styles.historyTitle}>{t('history')}</p>
        {history.length === 0 && (
          <p className={styles.historyEmpty}>{t('noRuns')}</p>
        )}
        <ul className={styles.historyList}>
          {history.map((run) => (
            <li key={run.id}>
              <button
                className={`${styles.historyItem} ${selectedRunId === run.id ? styles.historyItemActive : ''}`}
                onClick={() => handleSelectRun(run.id)}
                disabled={running}
              >
                <span className={styles.historyTask}>{run.task}</span>
                {run.answer && (
                  <span className={styles.historyAnswer}>
                    {run.answer.length > 80 ? run.answer.slice(0, 80) + '…' : run.answer}
                  </span>
                )}
                <span className={styles.historyMeta}>
                  {new Date(run.created_at).toLocaleDateString()}
                  {run.tokens_used != null && ` · ${run.tokens_used.toLocaleString()} tok`}
                  {run.status === 'running' && ' · in progress'}
                  {run.status === 'error' && !run.answer && ' · failed'}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </aside>

      {/* ── Main column ── */}
      <div className={styles.mainCol}>
        <div className={styles.header}>
          <h1 className={styles.title}>{t('title')}</h1>
          <p className={styles.subtitle}>{t('subtitle')}</p>
        </div>

        {/* ── Input ── */}
        <section className={styles.inputSection}>
          <div className={styles.examples}>
            {EXAMPLES.map((ex) => (
              <button
                key={ex}
                type="button"
                className={styles.exampleBtn}
                onClick={() => setTask(ex)}
                disabled={running}
              >
                {ex}
              </button>
            ))}
          </div>

          <form onSubmit={handleRun}>
            <textarea
              className={styles.textarea}
              placeholder={t('placeholder')}
              value={task}
              onChange={(e) => setTask(e.target.value)}
              rows={4}
              disabled={running}
            />
            <div className={styles.actions}>
              <button
                type="submit"
                className={styles.runBtn}
                disabled={running || !task.trim()}
              >
                {running ? t('running') : t('run')}
              </button>
            </div>
          </form>
        </section>

        {/* ── Trace ── */}
        {steps.length === 0 && !running && (
          <p className={styles.empty}>{t('emptyTrace')}</p>
        )}

        {steps.length > 0 && (
          <section className={styles.traceSection}>
            <p className={styles.traceHeader}>{t('trace')}</p>
            <div className={styles.trace}>
              {steps.map((step, i) => (
                <StepRow key={i} step={step} />
              ))}
              <div ref={traceEndRef} />
            </div>
          </section>
        )}
      </div>
    </main>
  )
}

function StepRow({ step }: { step: AgentEvent }) {
  const t = useTranslations('agent')
  switch (step.type) {
    case 'thought':
      return (
        <div className={`${styles.step} ${styles.stepThought}`}>
          <span className={styles.stepLabel}>{t('thought')}</span>
          <p className={styles.stepContent}>{step.content}</p>
        </div>
      )

    case 'tool_call':
      return (
        <div className={`${styles.step} ${styles.stepToolCall}`}>
          <span className={styles.stepLabel}>{t('toolCall')}</span>
          <span className={styles.stepName}>{step.name}</span>
          <pre className={styles.stepMono}>{JSON.stringify(step.args, null, 2)}</pre>
        </div>
      )

    case 'tool_result':
      return (
        <div className={`${styles.step} ${styles.stepToolResult}`}>
          <span className={styles.stepLabel}>{t('result', { name: step.name ?? '' })}</span>
          <pre className={styles.stepMono}>{JSON.stringify(step.result, null, 2)}</pre>
        </div>
      )

    case 'token_usage':
      return (
        <div className={styles.stepTokens}>
          <span className={styles.stepTokensText}>
            {step.total_tokens?.toLocaleString()} {t('tokens')}
            <span className={styles.stepTokensBreakdown}>
              {' '}({step.prompt_tokens?.toLocaleString()} · {step.completion_tokens?.toLocaleString()} {t('tokenBreakdown')})
            </span>
          </span>
        </div>
      )

    case 'answer':
      return (
        <div className={`${styles.step} ${styles.stepAnswer}`}>
          <span className={styles.stepLabel}>{t('answer')}</span>
          <p className={styles.answerContent}>{step.content}</p>
        </div>
      )

    case 'error':
      return (
        <div className={`${styles.step} ${styles.stepError}`}>
          <span className={styles.stepLabel}>{t('error')}</span>
          <p className={styles.stepContent}>{step.content}</p>
        </div>
      )

    default:
      return null
  }
}

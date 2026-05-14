'use client'
import { useEffect, useRef, useState } from 'react'
import { sendChatMessage } from '@/lib/api'
import type { ChatMessage } from '@/lib/types'
import styles from './ChatPanel.module.css'

interface Props {
  candidateId: string
}

export default function ChatPanel({ candidateId }: Props) {
  const [history, setHistory] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [history, loading])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    const message = input.trim()
    if (!message || loading) return

    const userMsg: ChatMessage = { role: 'user', content: message }
    setHistory((h) => [...h, userMsg])
    setInput('')
    setLoading(true)
    setError(null)

    try {
      const res = await sendChatMessage(candidateId, { history, message })
      setHistory((h) => [...h, { role: 'assistant', content: res.response }])
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Request failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={styles.panel}>
      <p className={styles.title}>Ask AI about this candidate</p>

      <div className={styles.thread}>
        {history.length === 0 && (
          <p className={styles.hint}>
            Ask anything — "What's their main tech stack?", "Are they senior enough for a
            lead role?", "Summarise their experience in two sentences."
          </p>
        )}
        {history.map((msg, i) => (
          <div
            key={i}
            className={`${styles.bubble} ${msg.role === 'user' ? styles.user : styles.assistant}`}
          >
            {msg.content}
          </div>
        ))}
        {loading && (
          <div className={`${styles.bubble} ${styles.assistant} ${styles.thinking}`}>
            Thinking…
          </div>
        )}
        {error && <p className={styles.error}>{error}</p>}
        <div ref={bottomRef} />
      </div>

      <form className={styles.form} onSubmit={submit}>
        <input
          className={styles.input}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask a question…"
          disabled={loading}
        />
        <button className={styles.send} type="submit" disabled={loading || !input.trim()}>
          Send
        </button>
      </form>
    </div>
  )
}

'use client'
import { useEffect, useState } from 'react'
import { useTranslations, useFormatter } from 'next-intl'
import { Link } from '@/navigation'
import { getCandidates } from '@/lib/api'
import type { CandidateListItem } from '@/lib/types'
import styles from './page.module.css'

export default function PipelinePage() {
  const t = useTranslations('pipeline')
  const format = useFormatter()
  const [runs, setRuns] = useState<CandidateListItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getCandidates()
      .then(setRuns)
      .finally(() => setLoading(false))
  }, [])

  const avgLatency = runs.length
    ? Math.round(runs.filter((r) => r.latency_ms).reduce((s, r) => s + (r.latency_ms ?? 0), 0) / runs.filter((r) => r.latency_ms).length)
    : null

  const totalTokens = runs.reduce((s, r) => s + (r.tokens_used ?? 0), 0)

  return (
    <main className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>{t('title')}</h1>
        <p className={styles.sub}>{t('subtitle')}</p>
      </div>

      {/* Stats row */}
      {!loading && runs.length > 0 && (
        <div className={styles.stats}>
          <Stat label={t('totalRuns')} value={String(runs.length)} />
          {avgLatency != null && <Stat label={t('avgParseTime')} value={`${avgLatency} ms`} />}
          {totalTokens > 0 && <Stat label={t('totalTokens')} value={totalTokens.toLocaleString()} />}
        </div>
      )}

      {loading && <p className={styles.muted}>{t('loading')}</p>}

      {!loading && runs.length === 0 && (
        <p className={styles.muted}>{t('empty')}</p>
      )}

      {runs.length > 0 && (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>{t('colCandidate')}</th>
                <th>{t('colFile')}</th>
                <th>{t('colIngestedAt')}</th>
                <th>{t('colParseTime')}</th>
                <th>{t('colTokens')}</th>
              </tr>
            </thead>
            <tbody>
              {runs.map((r) => (
                <tr key={r.id}>
                  <td>
                    <Link href={`/candidates/${r.id}`} className={styles.link}>
                      {r.full_name ?? 'Unknown'}
                    </Link>
                  </td>
                  <td className={styles.mono}>{r.filename}</td>
                  <td className={styles.mono}>
                    {format.dateTime(new Date(r.uploaded_at), {
                      day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
                    })}
                  </td>
                  <td className={styles.mono}>
                    {r.latency_ms != null ? `${r.latency_ms} ms` : '—'}
                  </td>
                  <td className={styles.mono}>
                    {r.tokens_used != null ? r.tokens_used.toLocaleString() : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className={styles.stat}>
      <span className={styles.statValue}>{value}</span>
      <span className={styles.statLabel}>{label}</span>
    </div>
  )
}

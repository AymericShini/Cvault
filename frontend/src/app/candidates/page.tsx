'use client'
import { useEffect, useState } from 'react'
import CandidateCard from '@/components/candidates/CandidateCard'
import { getCandidates } from '@/lib/api'
import type { CandidateListItem } from '@/lib/types'
import styles from './page.module.css'

export default function CandidatesPage() {
  const [candidates, setCandidates] = useState<CandidateListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    getCandidates()
      .then(setCandidates)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  return (
    <main className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Candidates</h1>
        <span className={styles.count}>
          {loading ? '—' : `${candidates.length} total`}
        </span>
      </div>

      {loading && <p className={styles.empty}>Loading…</p>}
      {error && <p className={styles.error}>{error}</p>}

      {!loading && !error && candidates.length === 0 && (
        <div className={styles.emptyState}>
          <p className={styles.emptyTitle}>No candidates yet</p>
          <p className={styles.emptySub}>
            Upload a CV from the <a href="/upload" className={styles.link}>Upload</a> page —
            it will appear here once parsed.
          </p>
        </div>
      )}

      {candidates.length > 0 && (
        <div className={styles.list}>
          {candidates.map((c) => (
            <CandidateCard key={c.id} candidate={c} />
          ))}
        </div>
      )}
    </main>
  )
}

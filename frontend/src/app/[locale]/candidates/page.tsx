'use client'
import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import CandidateCard from '@/components/candidates/CandidateCard'
import { getCandidates } from '@/lib/api'
import type { CandidateListItem } from '@/lib/types'
import styles from './page.module.css'

export default function CandidatesPage() {
  const t = useTranslations('candidates')
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
        <h1 className={styles.title}>{t('title')}</h1>
        <span className={styles.count}>
          {loading ? '—' : `${candidates.length} total`}
        </span>
      </div>

      {loading && <p className={styles.empty}>{t('loading')}</p>}
      {error && <p className={styles.error}>{error}</p>}

      {!loading && !error && candidates.length === 0 && (
        <div className={styles.emptyState}>
          <p className={styles.emptyTitle}>{t('emptyTitle')}</p>
          <p className={styles.emptySub}>{t('emptyText')}</p>
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

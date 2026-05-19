'use client'
import { useTranslations, useFormatter } from 'next-intl'
import { Link } from '@/navigation'
import type { CandidateListItem } from '@/lib/types'
import styles from './CandidateCard.module.css'

interface Props {
  candidate: CandidateListItem
}

export default function CandidateCard({ candidate: c }: Props) {
  const t = useTranslations('candidates')
  const format = useFormatter()
  const date = format.dateTime(new Date(c.uploaded_at), {
    day: 'numeric', month: 'short', year: 'numeric',
  })

  return (
    <Link href={`/candidates/${c.id}`} className={styles.card}>
      <div className={styles.main}>
        <span className={styles.name}>{c.full_name ?? t('unknown')}</span>
        {c.top_role && <span className={styles.role}>{c.top_role}</span>}
      </div>
      <div className={styles.meta}>
        <span className={styles.date}>{date}</span>
        {c.latency_ms != null && (
          <span className={styles.stat}>{c.latency_ms} ms</span>
        )}
        {c.tokens_used != null && (
          <span className={styles.stat}>{c.tokens_used.toLocaleString()} tok</span>
        )}
      </div>
    </Link>
  )
}

import Link from 'next/link'
import type { CandidateListItem } from '@/lib/types'
import styles from './CandidateCard.module.css'

interface Props {
  candidate: CandidateListItem
}

export default function CandidateCard({ candidate: c }: Props) {
  const date = new Date(c.uploaded_at).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric',
  })

  return (
    <Link href={`/candidates/${c.id}`} className={styles.card}>
      <div className={styles.main}>
        <span className={styles.name}>{c.full_name ?? 'Unknown'}</span>
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

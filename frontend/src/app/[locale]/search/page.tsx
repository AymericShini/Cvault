'use client'
import { Suspense, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Link } from '@/navigation'
import { useSearchParams } from 'next/navigation'
import { searchCandidates } from '@/lib/api'
import type { CandidateMatch, SearchRequest } from '@/lib/types'
import styles from './page.module.css'

const TOP_N_OPTIONS: Array<SearchRequest['top_n']> = [1, 5, 10]

function SearchContent() {
  const t = useTranslations('search')
  const searchParams = useSearchParams()
  const [query, setQuery] = useState(searchParams.get('q') ?? '')
  const [topN, setTopN] = useState<SearchRequest['top_n']>(5)
  const [results, setResults] = useState<CandidateMatch[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    if (!query.trim()) return
    setLoading(true)
    setError(null)
    setResults(null)
    try {
      const res = await searchCandidates({ query: query.trim(), top_n: topN })
      setResults(res.results)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Search failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>{t('title')}</h1>
        <p className={styles.subtitle}>{t('subtitle')}</p>
      </div>

      <form onSubmit={handleSearch} className={styles.form}>
        <textarea
          className={styles.textarea}
          placeholder={t('placeholder')}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          rows={6}
        />
        <div className={styles.controls}>
          <div className={styles.topNGroup}>
            <span className={styles.topNLabel}>{t('showTop')}</span>
            {TOP_N_OPTIONS.map((n) => (
              <button
                key={n}
                type="button"
                className={`${styles.topNBtn} ${topN === n ? styles.topNBtnActive : ''}`}
                onClick={() => setTopN(n)}
              >
                {n}
              </button>
            ))}
          </div>
          <button
            type="submit"
            className={styles.submitBtn}
            disabled={loading || !query.trim()}
          >
            {loading ? t('searching') : t('search')}
          </button>
        </div>
      </form>

      {error && <p className={styles.error}>{error}</p>}

      {results !== null && results.length === 0 && (
        <div className={styles.emptyState}>
          <p className={styles.emptyTitle}>{t('emptyTitle')}</p>
          <p className={styles.emptySub}>
            <Link href="/upload" className={styles.link}>{t('emptyText')}</Link>
          </p>
        </div>
      )}

      {results && results.length > 0 && (
        <div className={styles.results}>
          <p className={styles.resultsMeta}>
            {results.length} result{results.length !== 1 ? 's' : ''} · sorted by relevance
          </p>
          <div className={styles.list}>
            {results.map((r, i) => (
              <MatchCard key={r.candidate_id} match={r} rank={i + 1} />
            ))}
          </div>
        </div>
      )}
    </main>
  )
}

function MatchCard({ match, rank }: { match: CandidateMatch; rank: number }) {
  const t = useTranslations('search')
  const pct = Math.round(match.score * 100)
  return (
    <Link href={`/candidates/${match.candidate_id}`} className={styles.card}>
      <div className={styles.cardRank}>#{rank}</div>
      <div className={styles.cardBody}>
        <div className={styles.cardTop}>
          <span className={styles.cardName}>{match.full_name ?? match.filename}</span>
          {match.top_role && <span className={styles.cardRole}>{match.top_role}</span>}
        </div>
        <p className={styles.cardExcerpt}>{match.excerpt}</p>
      </div>
      <div className={styles.cardScore}>
        <span className={styles.scoreValue}>{pct}%</span>
        <span className={styles.scoreLabel}>{t('match')}</span>
        <div className={styles.scoreBar}>
          <div className={styles.scoreFill} style={{ width: `${pct}%` }} />
        </div>
      </div>
    </Link>
  )
}

export default function SearchPage() {
  return (
    <Suspense>
      <SearchContent />
    </Suspense>
  )
}

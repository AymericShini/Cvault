'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getJobs, createJob, deleteJob } from '@/lib/api'
import type { JobDescription } from '@/lib/types'
import styles from './page.module.css'

export default function JobsPage() {
  const router = useRouter()
  const [jobs, setJobs] = useState<JobDescription[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // new-job form state
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  useEffect(() => {
    getJobs()
      .then(setJobs)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim() || !description.trim()) return
    setSaving(true)
    setFormError(null)
    try {
      const job = await createJob({ title: title.trim(), description: description.trim() })
      setJobs((prev) => [job, ...prev])
      setTitle('')
      setDescription('')
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : 'Failed to save job')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteJob(id)
      setJobs((prev) => prev.filter((j) => j.id !== id))
    } catch {
      // silently ignore
    }
  }

  function handleSearch(job: JobDescription) {
    const params = new URLSearchParams({ q: job.description })
    router.push(`/search?${params.toString()}`)
  }

  return (
    <main className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Job Descriptions</h1>
        <span className={styles.count}>
          {loading ? '—' : `${jobs.length} saved`}
        </span>
      </div>

      {/* ─── Create form ─── */}
      <section className={styles.formSection}>
        <h2 className={styles.sectionTitle}>Save a new job</h2>
        <form onSubmit={handleCreate} className={styles.form}>
          <input
            className={styles.input}
            type="text"
            placeholder="Job title (e.g. Senior Backend Engineer)"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <textarea
            className={styles.textarea}
            placeholder="Paste the full job description here…"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={5}
          />
          {formError && <p className={styles.error}>{formError}</p>}
          <button
            type="submit"
            className={styles.saveBtn}
            disabled={saving || !title.trim() || !description.trim()}
          >
            {saving ? 'Saving…' : 'Save job'}
          </button>
        </form>
      </section>

      {/* ─── Jobs list ─── */}
      {loading && <p className={styles.muted}>Loading…</p>}
      {error && <p className={styles.error}>{error}</p>}

      {!loading && !error && jobs.length === 0 && (
        <p className={styles.muted}>No saved jobs yet. Add one above.</p>
      )}

      {jobs.length > 0 && (
        <section className={styles.list}>
          {jobs.map((job) => (
            <div key={job.id} className={styles.card}>
              <div className={styles.cardBody}>
                <p className={styles.cardTitle}>{job.title}</p>
                <p className={styles.cardDesc}>{job.description}</p>
                <p className={styles.cardDate}>
                  {new Date(job.created_at).toLocaleDateString('en-GB', {
                    day: 'numeric', month: 'short', year: 'numeric',
                  })}
                </p>
              </div>
              <div className={styles.cardActions}>
                <button
                  className={styles.searchBtn}
                  onClick={() => handleSearch(job)}
                >
                  Search candidates
                </button>
                <button
                  className={styles.deleteBtn}
                  onClick={() => handleDelete(job.id)}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </section>
      )}
    </main>
  )
}

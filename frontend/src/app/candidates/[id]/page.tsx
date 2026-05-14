'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import ChatPanel from '@/components/candidates/ChatPanel'
import { deleteCandidate, getCandidate } from '@/lib/api'
import type { CandidateRecord, Education } from '@/lib/types'
import styles from './page.module.css'

export default function CandidateDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [record, setRecord] = useState<CandidateRecord | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    getCandidate(id)
      .then(setRecord)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false))
  }, [id])

  async function handleDelete() {
    if (!confirm('Remove this candidate permanently?')) return
    setDeleting(true)
    try {
      await deleteCandidate(id)
      router.push('/candidates')
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Delete failed')
      setDeleting(false)
    }
  }

  if (loading) return <main className={styles.page}><p className={styles.muted}>Loading…</p></main>
  if (error) return <main className={styles.page}><p className={styles.error}>{error}</p></main>
  if (!record) return null

  const { parsed_cv: cv } = record
  const pi = cv.personal_info
  const hardSkills = [...cv.skills.languages, ...cv.skills.technical, ...cv.skills.tools]
  const topDegree = getHighestDegreeLabel(cv.education)
  const uploadDate = new Date(record.uploaded_at).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric',
  })

  return (
    <main className={styles.page}>
      {/* ── Header ── */}
      <div className={styles.header}>
        <div>
          <a href="/candidates" className={styles.back}>← Candidates</a>
          <h1 className={styles.name}>{pi.full_name ?? 'Unknown'}</h1>
          {cv.work_experience[0] && (
            <p className={styles.role}>
              {cv.work_experience[0].title} · {cv.work_experience[0].company}
            </p>
          )}
        </div>
        <button
          className={styles.btnDelete}
          onClick={handleDelete}
          disabled={deleting}
        >
          {deleting ? 'Removing…' : 'Remove'}
        </button>
      </div>

      <div className={styles.layout}>
        {/* ── Left: CV detail ── */}
        <div className={styles.cvCol}>
          {/* Info rows */}
          <div className={styles.infoBlock}>
            {pi.email && <InfoRow label="Email" value={pi.email} />}
            {pi.phone && <InfoRow label="Phone" value={pi.phone} />}
            {pi.location && <InfoRow label="Location" value={pi.location} />}
            {cv.total_experience_years != null && (
              <InfoRow label="Experience" value={`${cv.total_experience_years} years`} />
            )}
            {topDegree && <InfoRow label="Education" value={topDegree} />}
            {cv.spoken_languages.length > 0 && (
              <InfoRow
                label="Languages"
                value={cv.spoken_languages.map((l) => `${l.language} (${l.level})`).join(', ')}
              />
            )}
            <InfoRow label="Uploaded" value={uploadDate} />
            {record.latency_ms != null && (
              <InfoRow label="Parse time" value={`${record.latency_ms} ms`} />
            )}
          </div>

          {/* Professional summary */}
          {cv.professional_summary && (
            <section className={styles.section}>
              <p className={styles.sectionTitle}>Summary</p>
              <p className={styles.summary}>{cv.professional_summary}</p>
            </section>
          )}

          {/* Skills */}
          {hardSkills.length > 0 && (
            <section className={styles.section}>
              <p className={styles.sectionTitle}>Hard skills</p>
              <div className={styles.tags}>
                {hardSkills.map((s) => <span key={s} className={styles.tag}>{s}</span>)}
              </div>
            </section>
          )}
          {cv.skills.soft_skills.length > 0 && (
            <section className={styles.section}>
              <p className={styles.sectionTitle}>Soft skills</p>
              <div className={styles.tags}>
                {cv.skills.soft_skills.map((s) => <span key={s} className={styles.tagSoft}>{s}</span>)}
              </div>
            </section>
          )}
          {cv.certifications.length > 0 && (
            <section className={styles.section}>
              <p className={styles.sectionTitle}>Certifications</p>
              <div className={styles.tags}>
                {cv.certifications.map((c) => <span key={c} className={styles.tag}>{c}</span>)}
              </div>
            </section>
          )}

          {/* Experience */}
          {cv.work_experience.length > 0 && (
            <section className={styles.section}>
              <p className={styles.sectionTitle}>Experience</p>
              {cv.work_experience.map((job, i) => (
                <div key={i} className={styles.job}>
                  <div className={styles.jobMeta}>
                    <span className={styles.jobTitle}>{job.title}</span>
                    <span className={styles.jobCompany}>{job.company}</span>
                    <span className={styles.jobDate}>
                      {job.start_date ?? '?'} → {job.end_date ?? 'present'}
                    </span>
                  </div>
                  {job.responsibilities.length > 0 && (
                    <ul className={styles.bullets}>
                      {job.responsibilities.slice(0, 3).map((r, j) => <li key={j}>{r}</li>)}
                    </ul>
                  )}
                </div>
              ))}
            </section>
          )}

          {/* Education */}
          {cv.education.length > 0 && (
            <section className={styles.section}>
              <p className={styles.sectionTitle}>Education</p>
              {cv.education.map((edu, i) => (
                <div key={i} className={styles.job}>
                  <div className={styles.jobMeta}>
                    <span className={styles.jobTitle}>{edu.degree}</span>
                    <span className={styles.jobCompany}>{edu.institution}</span>
                    {edu.graduation_year && (
                      <span className={styles.jobDate}>{edu.graduation_year}</span>
                    )}
                  </div>
                  {edu.field && <p className={styles.eduField}>{edu.field}</p>}
                </div>
              ))}
            </section>
          )}

          {/* Projects */}
          {cv.personal_projects.length > 0 && (
            <section className={styles.section}>
              <p className={styles.sectionTitle}>Projects</p>
              {cv.personal_projects.map((proj, i) => (
                <div key={i} className={styles.job}>
                  <div className={styles.jobMeta}>
                    <span className={styles.jobTitle}>{proj.name}</span>
                    {proj.year && <span className={styles.jobDate}>{proj.year}</span>}
                  </div>
                  {proj.description && <p className={styles.eduField}>{proj.description}</p>}
                  {proj.url && (
                    <a href={proj.url} target="_blank" rel="noopener noreferrer" className={styles.projUrl}>
                      {proj.url}
                    </a>
                  )}
                </div>
              ))}
            </section>
          )}
        </div>

        {/* ── Right: Chat ── */}
        <div className={styles.chatCol}>
          <ChatPanel candidateId={id} />
        </div>
      </div>
    </main>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className={styles.row}>
      <span className={styles.rowLabel}>{label}</span>
      <span className={styles.rowValue}>{value}</span>
    </div>
  )
}

// ─── Degree normalisation (same logic as ResultPreview) ───────────────────────
const DEGREE_RANKS: Array<[RegExp, number, string]> = [
  [/phd|ph\.d|doctor/i, 5, 'PhD'],
  [/mba/i, 4, 'MBA'],
  [/master|m\.sc|msc|m\.eng|m\.a\b/i, 4, 'Master'],
  [/bachelor|b\.sc|bsc|b\.a\b|licen[cs]/i, 3, 'Bachelor'],
  [/associate|bts|dut/i, 2, 'Associate'],
  [/bac\b|high school|diploma/i, 1, 'High School'],
]
function parseDegree(degree: string | null): { rank: number; label: string } {
  if (!degree) return { rank: 0, label: 'Degree' }
  for (const [re, rank, label] of DEGREE_RANKS) {
    if (re.test(degree)) return { rank, label }
  }
  return { rank: 0, label: degree }
}
function getHighestDegreeLabel(education: Education[]): string | null {
  if (!education.length) return null
  const highest = education.reduce((best, curr) =>
    parseDegree(curr.degree).rank >= parseDegree(best.degree).rank ? curr : best
  )
  const { label } = parseDegree(highest.degree)
  const detail = highest.field ?? highest.institution
  return detail ? `${label} · ${detail}` : label
}

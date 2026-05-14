'use client'
import { useEffect, useMemo, useState } from 'react'
import type { LlmStats, ParsedCV, Education } from '@/lib/types'
import styles from './ResultPreview.module.css'

interface Props {
  result: ParsedCV
  filename: string
  file: File
  onReset: () => void
  llmStats?: LlmStats
}

export default function ResultPreview({ result, filename, file, onReset, llmStats }: Props) {
  const [showJson, setShowJson] = useState(false)
  const { personal_info: pi, skills, work_experience, confidence_scores: cs, education, certifications } = result

  const hardSkills = [...skills.languages, ...skills.technical, ...skills.tools]
  const topDegree = getHighestDegreeLabel(education)

  const pdfUrl = useMemo(() => URL.createObjectURL(file), [file])
  useEffect(() => () => URL.revokeObjectURL(pdfUrl), [pdfUrl])

  return (
    <div className={styles.wrapper}>
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <div>
            <h2 className={styles.name}>{pi.full_name ?? 'Unknown'}</h2>
            {work_experience[0] && (
              <p className={styles.role}>{work_experience[0].title} · {work_experience[0].company}</p>
            )}
            {pi.location && <p className={styles.location}>{pi.location}</p>}
          </div>
          <div className={styles.actions}>
            <button className={styles.btnSecondary} onClick={() => setShowJson((v) => !v)}>
              {showJson ? 'Hide JSON' : 'View JSON'}
            </button>
            <button className={styles.btnPrimary} onClick={onReset}>
              Parse another
            </button>
          </div>
        </div>

        <div className={styles.grid}>
          {/* Left column */}
          <div className={styles.col}>
            {pi.email && <InfoRow label="Email" value={pi.email} />}
            {pi.phone && <InfoRow label="Phone" value={pi.phone} />}
            {result.total_experience_years != null && (
              <InfoRow label="Experience" value={`${result.total_experience_years} years`} />
            )}
            {topDegree && <InfoRow label="Education" value={topDegree} />}
            {result.spoken_languages.length > 0 && (
              <InfoRow
                label="Languages"
                value={result.spoken_languages.map((l) => `${l.language} (${l.level})`).join(', ')}
              />
            )}

            {hardSkills.length > 0 && (
              <div className={styles.skillsBlock}>
                <span className={styles.rowLabel}>Hard skills</span>
                <div className={styles.tags}>
                  {hardSkills.slice(0, 14).map((s) => (
                    <span key={s} className={styles.tag}>{s}</span>
                  ))}
                </div>
              </div>
            )}

            {skills.soft_skills.length > 0 && (
              <div className={styles.skillsBlock}>
                <span className={styles.rowLabel}>Soft skills</span>
                <div className={styles.tags}>
                  {skills.soft_skills.map((s) => (
                    <span key={s} className={styles.tagSoft}>{s}</span>
                  ))}
                </div>
              </div>
            )}

            {certifications.length > 0 && (
              <div className={styles.skillsBlock}>
                <span className={styles.rowLabel}>Certifications</span>
                <div className={styles.tags}>
                  {certifications.map((c) => (
                    <span key={c} className={styles.tag}>{c}</span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right column — Confidence scores */}
          <div className={styles.col}>
            <p className={styles.sectionTitle}>Confidence scores</p>
            <div className={styles.scores}>
              <ScoreBar label="Name" value={cs.full_name} />
              <ScoreBar label="Email" value={cs.email} />
              <ScoreBar label="Experience" value={cs.total_experience_years} />
              <ScoreBar label="Skills" value={cs.skills} />
            </div>
            <p className={styles.scoreNote}>
              Rated by the model itself. Below 0.7 means the field may need manual review.
            </p>
          </div>
        </div>

        {/* Work experience */}
        {work_experience.length > 0 && (
          <div className={styles.timeline}>
            <p className={styles.sectionTitle}>Experience</p>
            {work_experience.map((job, i) => (
              <div key={i} className={styles.job}>
                <div className={styles.jobMeta}>
                  <span className={styles.jobTitle}>{job.title}</span>
                  <span className={styles.jobCompany}>{job.company}</span>
                  <span className={styles.jobDate}>
                    {job.start_date ?? '?'} → {job.end_date ?? '?'}
                  </span>
                </div>
                {job.responsibilities.length > 0 && (
                  <ul className={styles.bullets}>
                    {job.responsibilities.slice(0, 2).map((r, j) => (
                      <li key={j}>{r}</li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Personal projects */}
        {result.personal_projects.length > 0 && (
          <div className={styles.projects}>
            <p className={styles.sectionTitle}>Projects</p>
            {result.personal_projects.map((proj, i) => (
              <div key={i} className={styles.project}>
                <div className={styles.projectMeta}>
                  <span className={styles.projectTitle}>{proj.name}</span>
                  {proj.year && <span className={styles.projectYear}>{proj.year}</span>}
                </div>
                {proj.description && (
                  <p className={styles.projectDesc}>{proj.description}</p>
                )}
                {proj.url && (
                  <a
                    href={proj.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.projectUrl}
                  >
                    {proj.url}
                  </a>
                )}
              </div>
            ))}
          </div>
        )}

        {/* LLM stats footer */}
        {llmStats && (
          <div className={styles.llmFooter}>
            <span className={styles.llmStat}>
              <span className={styles.llmLabel}>model</span>
              <span className={styles.llmValue}>{llmStats.model}</span>
            </span>
            <span className={styles.llmDivider} />
            <span className={styles.llmStat}>
              <span className={styles.llmLabel}>tokens</span>
              <span className={styles.llmValue}>{llmStats.tokens_used.toLocaleString()}</span>
            </span>
            <span className={styles.llmDivider} />
            <span className={styles.llmStat}>
              <span className={styles.llmLabel}>latency</span>
              <span className={styles.llmValue}>{llmStats.latency_ms.toLocaleString()} ms</span>
            </span>
          </div>
        )}

        {/* Raw JSON */}
        {showJson && (
          <div className={styles.jsonBlock}>
            <pre>{JSON.stringify(result, null, 2)}</pre>
          </div>
        )}
      </div>

      <div className={styles.pdfPane}>
        <iframe src={pdfUrl} title="Uploaded CV" />
      </div>
    </div>
  )
}

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

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className={styles.row}>
      <span className={styles.rowLabel}>{label}</span>
      <span className={styles.rowValue}>{value}</span>
    </div>
  )
}

function ScoreBar({ label, value }: { label: string; value: number }) {
  const pct = Math.round(value * 100)
  const cls = value >= 0.8 ? styles.high : value >= 0.5 ? styles.mid : styles.low
  return (
    <div className={styles.scoreRow}>
      <span className={styles.scoreLabel}>{label}</span>
      <div className={styles.barTrack}>
        <div className={`${styles.barFill} ${cls}`} style={{ width: `${pct}%` }} />
      </div>
      <span className={`${styles.scorePct} ${cls}`}>{pct}%</span>
    </div>
  )
}

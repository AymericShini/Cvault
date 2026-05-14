'use client'
import { useCallback, useState } from 'react'
import styles from './DropZone.module.css'

interface Props {
  onFile: (file: File) => void
  disabled?: boolean
}

export default function DropZone({ onFile, disabled }: Props) {
  const [dragOver, setDragOver] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handle = useCallback((file: File) => {
    setError(null)
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      setError('Only PDF files are supported in Phase 1.')
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      setError('File is too large. Maximum size is 10 MB.')
      return
    }
    onFile(file)
  }, [onFile])

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) handle(file)
  }, [handle])

  const onInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handle(file)
  }, [handle])

  return (
    <div className={styles.wrap}>
      <label
        className={`${styles.zone} ${dragOver ? styles.over : ''} ${disabled ? styles.disabled : ''}`}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
      >
        <input
          type="file"
          accept=".pdf"
          className={styles.input}
          onChange={onInputChange}
          disabled={disabled}
        />
        <div className={styles.icon}>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14,2 14,8 20,8"/>
            <line x1="12" y1="18" x2="12" y2="12"/>
            <line x1="9" y1="15" x2="15" y2="15"/>
          </svg>
        </div>
        <p className={styles.label}>
          {dragOver ? 'Drop it' : 'Drop a PDF here'}
        </p>
        <p className={styles.sub}>or click to browse — max 10 MB</p>
      </label>
      {error && <p className={styles.error}>{error}</p>}
    </div>
  )
}

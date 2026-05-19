'use client'
import { useState } from 'react'
import { useTranslations } from 'next-intl'
import Sidebar from './Sidebar'
import styles from './Shell.module.css'

export default function Shell({ children }: { children: React.ReactNode }) {
  const t = useTranslations('nav')
  const [open, setOpen] = useState(false)
  return (
    <div className={styles.shell}>
      <Sidebar isOpen={open} onClose={() => setOpen(false)} />
      {open && <div className={styles.overlay} onClick={() => setOpen(false)} />}
      <main className={styles.main}>
        <button
          className={styles.menuBtn}
          onClick={() => setOpen(true)}
          aria-label={t('open')}
        >
          <svg width="20" height="16" viewBox="0 0 20 16" fill="none">
            <rect y="0" width="20" height="2" rx="1" fill="currentColor" />
            <rect y="7" width="20" height="2" rx="1" fill="currentColor" />
            <rect y="14" width="20" height="2" rx="1" fill="currentColor" />
          </svg>
        </button>
        {children}
      </main>
    </div>
  )
}

'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import styles from './Sidebar.module.css'

interface NavItem {
  label: string
  href: string
  phase: number
  active: boolean
}

const NAV: NavItem[] = [
  { label: 'Dashboard',  href: '/',          phase: 1, active: true  },
  { label: 'Upload CV',  href: '/upload',    phase: 1, active: true  },
  { label: 'Candidates', href: '/candidates', phase: 2, active: true  },
  { label: 'Search',     href: '/search',    phase: 3, active: true  },
  { label: 'Jobs',       href: '/jobs',      phase: 3, active: true  },
  { label: 'Agent',      href: '/agent',     phase: 4, active: true  },
  { label: 'Pipeline',   href: '/pipeline',  phase: 2, active: true  },
]

interface SidebarProps {
  isOpen: boolean
  onClose: () => void
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname()
  return (
    <aside className={`${styles.sidebar} ${isOpen ? styles.open : ''}`}>
      <button className={styles.closeBtn} onClick={onClose} aria-label="Close navigation">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path d="M1 1l12 12M13 1L1 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </button>
      <div className={styles.logo}>
        <span className={styles.logoMark}>CV</span>
        <span className={styles.logoWord}>ault</span>
      </div>

      <nav className={styles.nav}>
        {NAV.map((item, i) => {
          const isActive = pathname === item.href
          const isEnabled = item.active
          return (
            <div key={item.href}>
              {i === 2 && <div className={styles.divider} />}
              {i === 6 && <div className={styles.divider} />}
              {isEnabled ? (
                <Link
                  href={item.href}
                  className={`${styles.item} ${isActive ? styles.current : ''}`}
                >
                  {item.label}
                </Link>
              ) : (
                <span className={`${styles.item} ${styles.disabled}`}>
                  {item.label}
                  <span className={styles.badge}>Ph.{item.phase}</span>
                </span>
              )}
            </div>
          )
        })}
      </nav>

      <div className={styles.footer}>
        <span className={styles.phase}>Phase 4</span>
        <span className={styles.footerSub}>Agentic Workflow</span>
      </div>
    </aside>
  )
}

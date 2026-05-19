'use client'
import { useTranslations, useLocale } from 'next-intl'
import { Link, usePathname, useRouter } from '@/navigation'
import styles from './Sidebar.module.css'

interface NavItem {
  key: 'dashboard' | 'upload' | 'candidates' | 'search' | 'jobs' | 'agent' | 'pipeline'
  href: string
  phase: number
  active: boolean
}

const NAV: NavItem[] = [
  { key: 'dashboard',  href: '/',          phase: 1, active: true  },
  { key: 'upload',     href: '/upload',    phase: 1, active: true  },
  { key: 'candidates', href: '/candidates', phase: 2, active: true  },
  { key: 'search',     href: '/search',    phase: 3, active: true  },
  { key: 'jobs',       href: '/jobs',      phase: 3, active: true  },
  { key: 'agent',      href: '/agent',     phase: 4, active: true  },
  { key: 'pipeline',   href: '/pipeline',  phase: 2, active: true  },
]

interface SidebarProps {
  isOpen: boolean
  onClose: () => void
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const t = useTranslations('nav')
  const locale = useLocale()
  const pathname = usePathname()
  const router = useRouter()

  function switchLocale() {
    router.replace(pathname, { locale: locale === 'en' ? 'fr' : 'en' })
  }

  return (
    <aside className={`${styles.sidebar} ${isOpen ? styles.open : ''}`}>
      <button className={styles.closeBtn} onClick={onClose} aria-label={t('close')}>
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
                  {t(item.key)}
                </Link>
              ) : (
                <span className={`${styles.item} ${styles.disabled}`}>
                  {t(item.key)}
                  <span className={styles.badge}>Ph.{item.phase}</span>
                </span>
              )}
            </div>
          )
        })}
      </nav>

      <button className={styles.langSwitch} onClick={switchLocale}>
        {t('switchFlag')} {t('switchLang')}
      </button>

      <div className={styles.footer}>
        <span className={styles.phase}>{t('phase')}</span>
        <span className={styles.footerSub}>{t('phaseLabel')}</span>
      </div>
    </aside>
  )
}

import { getTranslations } from 'next-intl/server'
import { Link } from '@/navigation'
import styles from './page.module.css'

export default async function Dashboard() {
  const t = await getTranslations('dashboard')
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1>CVault</h1>
        <p className={styles.sub}>{t('subtitle')}</p>
      </header>

      <p className={styles.description}>{t('description')}</p>

      <section className={styles.phasesSection}>
        <h2 className={styles.phasesTitle}>{t('pillarsTitle')}</h2>
        <ol className={styles.phaseList}>
          <li className={styles.phaseItem}>
            <span className={`${styles.phaseMarker} ${styles.done}`}>✓</span>
            <div>
              <div className={styles.phaseName}>{t('phase1Name')}</div>
              <div className={styles.phaseDesc}>{t('phase1Desc')}</div>
            </div>
          </li>
          <li className={styles.phaseItem}>
            <span className={`${styles.phaseMarker} ${styles.done}`}>✓</span>
            <div>
              <div className={styles.phaseName}>{t('phase2Name')}</div>
              <div className={styles.phaseDesc}>{t('phase2Desc')}</div>
            </div>
          </li>
          <li className={styles.phaseItem}>
            <span className={`${styles.phaseMarker} ${styles.done}`}>✓</span>
            <div>
              <div className={styles.phaseName}>{t('phase3Name')}</div>
              <div className={styles.phaseDesc}>{t('phase3Desc')}</div>
            </div>
          </li>
          <li className={styles.phaseItem}>
            <span className={`${styles.phaseMarker} ${styles.active}`}>→</span>
            <div>
              <div className={styles.phaseName}>{t('phase4Name')}</div>
              <div className={styles.phaseDesc}>{t('phase4Desc')}</div>
            </div>
          </li>
        </ol>
      </section>

      <Link href="/upload" className={styles.cta}>{t('cta')}</Link>
    </div>
  )
}

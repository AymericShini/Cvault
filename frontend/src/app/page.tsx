import styles from './page.module.css'

export default function Dashboard() {
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1>Dashboard</h1>
        <p className={styles.sub}>Your candidate intelligence overview</p>
      </header>
      <div className={styles.empty}>
        <p>Phase 1 in progress — start by uploading a CV.</p>
        <a href="/upload" className={styles.cta}>Upload your first CV →</a>
      </div>
    </div>
  )
}

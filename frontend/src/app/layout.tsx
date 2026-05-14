import type { Metadata } from 'next'
import './globals.css'
import Sidebar from '@/components/layout/Sidebar'
import styles from './layout.module.css'

export const metadata: Metadata = {
  title: 'CVault — AI Candidate Intelligence',
  description: 'AI-powered CV parsing and candidate management',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className={styles.shell}>
          <Sidebar />
          <main className={styles.main}>{children}</main>
        </div>
      </body>
    </html>
  )
}

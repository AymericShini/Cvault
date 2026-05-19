import type { Metadata } from 'next'
import './globals.css'
import Shell from '@/components/layout/Shell'

export const metadata: Metadata = {
  title: 'CVault — AI Candidate Intelligence',
  description: 'AI-powered CV parsing and candidate management',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Shell>{children}</Shell>
      </body>
    </html>
  )
}

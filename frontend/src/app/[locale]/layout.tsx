import type { Metadata } from 'next'
import { NextIntlClientProvider } from 'next-intl'
import { getMessages } from 'next-intl/server'
import '../globals.css'
import Shell from '@/components/layout/Shell'

export const metadata: Metadata = {
  title: 'CVault — AI Candidate Intelligence',
  description: 'AI-powered CV parsing and candidate management',
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: { locale: string }
}) {
  const messages = await getMessages()
  return (
    <html lang={params.locale}>
      <body>
        <NextIntlClientProvider messages={messages}>
          <Shell>{children}</Shell>
        </NextIntlClientProvider>
      </body>
    </html>
  )
}

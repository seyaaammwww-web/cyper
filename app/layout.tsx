import type { Metadata, Viewport } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { Shell } from '@/components/shell'
import './globals.css'

const _geistSans = Geist({ subsets: ['latin'] })
const _geistMono = Geist_Mono({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Cyper Ops Console — Gaming Cafe Management',
  description:
    'Cyper gaming cafe operations console: live PC fleet, session billing, snack orders, reservations, customers, analytics, and audit trail — backed by a real database.',
}

export const viewport: Viewport = {
  themeColor: '#0b0712',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="bg-background">
      <body className="font-sans antialiased">
        <Shell>{children}</Shell>
      </body>
    </html>
  )
}

import type { Metadata, Viewport } from 'next'
import { Rajdhani, Cairo, Geist_Mono } from 'next/font/google'
import { Shell } from '@/components/shell'
import './globals.css'

const rajdhani = Rajdhani({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-rajdhani',
})
const cairo = Cairo({
  subsets: ['arabic'],
  weight: ['400', '600', '700'],
  variable: '--font-cairo',
})
const geistMono = Geist_Mono({
  subsets: ['latin'],
  variable: '--font-geist-mono',
})

export const metadata: Metadata = {
  title: 'Kazoza Command Console — Gaming Cafe Management',
  description:
    'Kazoza Gaming Center command console: live station deployment map, session billing, snack orders, reservations, customers, analytics, and audit trail — backed by a real database.',
}

export const viewport: Viewport = {
  themeColor: '#0d0f0c',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html
      lang="en"
      className={`bg-background ${rajdhani.variable} ${cairo.variable} ${geistMono.variable}`}
    >
      <body className="font-sans antialiased">
        <Shell>{children}</Shell>
      </body>
    </html>
  )
}

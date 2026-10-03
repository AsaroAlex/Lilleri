import type { Metadata } from 'next'
import localFont from 'next/font/local'
import '@lilleri/brand/tokens.css'
import './globals.css'

const geist = localFont({
  src: '../../../packages/brand/fonts/Geist-Variable.woff2',
  variable: '--font-geist',
  display: 'swap',
})
const newsreader = localFont({
  src: '../../../packages/brand/fonts/Newsreader-Variable.woff2',
  variable: '--font-newsreader',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Lilleri — Capisci le spese. Ritrova il quadro.',
  description:
    'Entrate, spese e movimenti in un quadro chiaro. Correggi le categorie, controlla gli abbinamenti ed esplora Lilleri nella demo locale con dati dimostrativi.',
  robots: { index: false, follow: false },
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="it">
      <body className={`${geist.variable} ${newsreader.variable}`}>{children}</body>
    </html>
  )
}

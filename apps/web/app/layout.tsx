import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './styles.css'

const inter = Inter({ subsets: ['latin'] })

const khmerFontsUrl = 'https://fonts.googleapis.com/css2?family=Battambang:wght@400;700&family=Bokor&family=Chenla&family=Content&family=Hanuman:wght@400;700&family=Khmer&family=Koulen&family=Moul&family=Noto+Sans+Khmer:wght@400;700&family=Siemreap&display=swap';

export const metadata: Metadata = {
  title: 'SchoolSync',
  description: 'Modern school attendance management system',
  icons: {
    icon: '/favicon.svg',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href={khmerFontsUrl} rel="stylesheet" />
      </head>
      <body className={inter.className}>{children}</body>
    </html>
  )
}
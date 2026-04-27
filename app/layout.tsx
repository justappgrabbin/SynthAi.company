import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Morph Interface',
  description: 'Upload, integrate, and evolve with Morph OS',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}

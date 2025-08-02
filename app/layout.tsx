import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Mizual',
  description: 'Mizual',
  generator: 'Mizual,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}

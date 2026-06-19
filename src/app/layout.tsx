import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Barbu — Suivi de parties',
  description: 'Application de suivi du jeu du Barbu',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body className="min-h-screen bg-stone-50">
        {children}
      </body>
    </html>
  )
}

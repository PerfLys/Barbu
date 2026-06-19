'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import type { Session } from '@/lib/game'

type View = 'home' | 'reprendre' | 'historique'

export default function DashboardPage() {
  const router = useRouter()
  const supabase = createClient()
  const [view, setView] = useState<View>('home')
  const [sessions, setSessions] = useState<Session[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    async function checkAuth() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) router.push('/login')
    }
    checkAuth()
  }, [])

  async function loadSessions(filter: 'active' | 'completed') {
    setLoading(true)
    const statuses = filter === 'active' ? ['active', 'paused'] : ['completed']
    const { data } = await supabase
      .from('sessions')
      .select('*')
      .in('status', statuses)
      .order('updated_at', { ascending: false })
    setSessions((data ?? []) as Session[])
    setLoading(false)
  }

  function handleView(v: View) {
    setView(v)
    if (v === 'reprendre') loadSessions('active')
    if (v === 'historique') loadSessions('completed')
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <div className="min-h-screen bg-stone-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-stone-200">
        <div className="max-w-lg mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">♛</span>
            <span className="font-bold text-stone-900 text-xl tracking-tight">Barbu</span>
          </div>
          <button
            onClick={handleLogout}
            className="text-sm text-stone-400 hover:text-stone-700 transition-colors"
          >
            Déconnexion
          </button>
        </div>
      </header>

      <main className="flex-1 max-w-lg mx-auto w-full px-4 py-8 flex flex-col gap-4">
        {view === 'home' && (
          <>
            <p className="text-stone-400 text-sm text-center mb-2">Que veux-tu faire ?</p>

            <Link
              href="/session/new"
              className="flex items-center gap-4 bg-red-700 text-white rounded-2xl px-5 py-5 hover:bg-red-800 transition-colors shadow-sm"
            >
              <span className="text-3xl">✦</span>
              <div>
                <p className="font-bold text-lg leading-tight">Nouvelle partie</p>
                <p className="text-red-200 text-sm">Créer et configurer une partie</p>
              </div>
            </Link>

            <button
              onClick={() => handleView('reprendre')}
              className="flex items-center gap-4 bg-white rounded-2xl px-5 py-5 border border-stone-200 hover:border-stone-300 hover:shadow-sm transition-all text-left"
            >
              <span className="text-3xl">▶</span>
              <div>
                <p className="font-bold text-lg text-stone-900 leading-tight">Reprendre une partie</p>
                <p className="text-stone-500 text-sm">Parties en cours ou en pause</p>
              </div>
            </button>

            <button
              onClick={() => handleView('historique')}
              className="flex items-center gap-4 bg-white rounded-2xl px-5 py-5 border border-stone-200 hover:border-stone-300 hover:shadow-sm transition-all text-left"
            >
              <span className="text-3xl">📋</span>
              <div>
                <p className="font-bold text-lg text-stone-900 leading-tight">Historique</p>
                <p className="text-stone-500 text-sm">Toutes les parties terminées</p>
              </div>
            </button>
          </>
        )}

        {(view === 'reprendre' || view === 'historique') && (
          <>
            <div className="flex items-center gap-3 mb-1">
              <button
                onClick={() => setView('home')}
                className="text-stone-500 hover:text-stone-800 text-lg"
              >
                ←
              </button>
              <h2 className="font-bold text-stone-900 text-lg">
                {view === 'reprendre' ? 'Reprendre une partie' : 'Historique'}
              </h2>
            </div>

            {loading && (
              <div className="text-center py-12 text-stone-400">Chargement...</div>
            )}

            {!loading && sessions.length === 0 && (
              <div className="text-center py-12">
                <div className="text-4xl mb-3">🃏</div>
                <p className="text-stone-500">
                  {view === 'reprendre'
                    ? 'Aucune partie en cours.'
                    : 'Aucune partie terminée.'}
                </p>
                {view === 'reprendre' && (
                  <Link href="/session/new" className="inline-block mt-4 text-sm text-red-700 font-semibold">
                    Créer une partie →
                  </Link>
                )}
              </div>
            )}

            <div className="space-y-2">
              {sessions.map((s) => (
                <Link
                  key={s.id}
                  href={`/session/${s.id}`}
                  className="flex items-center justify-between bg-white rounded-xl px-4 py-4 border border-stone-200 hover:border-red-300 hover:shadow-sm transition-all"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-stone-900">{s.name}</p>
                      {s.status === 'paused' && (
                        <span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full font-medium">
                          En pause
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-stone-500 mt-0.5">
                      {s.player_count} joueurs · {formatDate(s.updated_at)}
                    </p>
                  </div>
                  <span className="text-stone-400 text-lg ml-3">›</span>
                </Link>
              ))}
            </div>
          </>
        )}
      </main>

      {/* Suits décoratifs */}
      {view === 'home' && (
        <p className="text-center text-stone-300 pb-6 text-lg tracking-widest">♠ ♥ ♦ ♣</p>
      )}
    </div>
  )
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

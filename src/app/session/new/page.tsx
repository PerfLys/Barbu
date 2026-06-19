'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { generateRounds, drawRandomPlayer, type ContractMode } from '@/lib/game'
import Link from 'next/link'

export default function NewSessionPage() {
  const router = useRouter()
  const supabase = createClient()

  const [name, setName] = useState('')
  const [players, setPlayers] = useState(['', '', '', ''])
  const [contractMode, setContractMode] = useState<ContractMode | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function addPlayer() {
    if (players.length < 6) setPlayers((p) => [...p, ''])
  }

  function removePlayer() {
    if (players.length > 3) setPlayers((p) => p.slice(0, -1))
  }

  function setPlayerName(i: number, value: string) {
    setPlayers((prev) => prev.map((n, idx) => (idx === i ? value : n)))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (players.some((n) => !n.trim())) {
      setError('Veuillez saisir le nom de chaque joueur.')
      return
    }
    if (contractMode === null) {
      setError('Veuillez choisir le mode de contrats.')
      return
    }

    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Non connecté')

      const playerCount = players.length
      const sessionName =
        name.trim() ||
        new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })

      const firstDrawer = drawRandomPlayer(playerCount)

      const { data: session, error: sessionErr } = await supabase
        .from('sessions')
        .insert({
          owner_id: user.id,
          name: sessionName,
          player_count: playerCount,
          status: 'active',
          contract_mode: contractMode,
          first_drawer_position: firstDrawer,
        })
        .select()
        .single()
      if (sessionErr) throw sessionErr

      await supabase.from('session_players').insert(
        players.map((n, i) => ({ session_id: session.id, name: n.trim(), position: i }))
      )

      const rounds = generateRounds(playerCount, contractMode)
      await supabase.from('rounds').insert(
        rounds.map((r) => ({
          session_id: session.id,
          round_index: r.roundIndex,
          meneur_position: r.meneurPosition,
          contract: r.contract ?? null,
          completed_at: null,
        }))
      )

      router.push(`/session/${session.id}`)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la création')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-stone-50">
      <header className="bg-white border-b border-stone-200 sticky top-0 z-10">
        <div className="max-w-lg mx-auto px-4 py-4 flex items-center gap-3">
          <Link href="/dashboard" className="text-stone-500 hover:text-stone-800 text-lg">←</Link>
          <h1 className="font-bold text-stone-900">Nouvelle partie</h1>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6">
        <form onSubmit={handleSubmit} className="space-y-5">

          {/* Nom de la partie */}
          <div className="bg-white rounded-xl border border-stone-200 p-4">
            <label className="block text-sm font-semibold text-stone-700 mb-2">Nom de la partie</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={new Date().toLocaleDateString('fr-FR', {
                day: 'numeric', month: 'long', year: 'numeric',
              })}
              className="w-full px-3 py-2.5 border border-stone-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
            />
            <p className="text-xs text-stone-400 mt-1.5">Laissez vide → date du jour automatique</p>
          </div>

          {/* Joueurs */}
          <div className="bg-white rounded-xl border border-stone-200 p-4">
            <div className="flex items-center justify-between mb-1">
              <label className="text-sm font-semibold text-stone-700">
                Joueurs <span className="text-stone-400 font-normal">({players.length})</span>
              </label>
              <div className="flex gap-1.5">
                <button type="button" onClick={removePlayer} disabled={players.length <= 3}
                  className="w-7 h-7 rounded-full border border-stone-300 text-stone-600 flex items-center justify-center text-sm font-bold disabled:opacity-30 hover:bg-stone-50">−</button>
                <button type="button" onClick={addPlayer} disabled={players.length >= 6}
                  className="w-7 h-7 rounded-full border border-stone-300 text-stone-600 flex items-center justify-center text-sm font-bold disabled:opacity-30 hover:bg-stone-50">+</button>
              </div>
            </div>

            {/* Instruction d'ordre */}
            <div className="flex items-start gap-2 bg-amber-50 rounded-lg px-3 py-2 mb-3 border border-amber-100">
              <span className="text-amber-500 mt-0.5">↺</span>
              <p className="text-xs text-amber-800">
                Merci de mettre les joueurs dans l'ordre, <strong>sens inverse des aiguilles d'une montre</strong>.
                En premier, celui qui tient le téléphone des scores.
              </p>
            </div>

            <div className="space-y-2.5">
              {players.map((playerName, i) => (
                <div key={i} className="flex items-center gap-2.5">
                  <span className="w-6 h-6 rounded-full bg-stone-100 text-stone-500 text-xs font-bold flex items-center justify-center flex-shrink-0">
                    {i + 1}
                  </span>
                  <input
                    type="text"
                    value={playerName}
                    onChange={(e) => setPlayerName(i, e.target.value)}
                    placeholder={`Joueur ${i + 1}`}
                    required
                    className="flex-1 px-3 py-2 border border-stone-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>
              ))}
            </div>
            <p className="text-xs text-stone-400 mt-3">{players.length} joueurs · {players.length * 7} contrats au total</p>
          </div>

          {/* Mode de contrats */}
          <div className="bg-white rounded-xl border border-stone-200 p-4">
            <p className="text-sm font-semibold text-stone-700 mb-1">
              On fait les contrats un par un ou d'un coup ?
            </p>
            <p className="text-xs text-stone-500 mb-3">
              Chaque joueur a 7 contrats à jouer dans la partie.
            </p>
            <div className="space-y-2.5">
              <button
                type="button"
                onClick={() => setContractMode('interleaved')}
                className={`w-full text-left px-4 py-3 rounded-xl border-2 transition-all ${
                  contractMode === 'interleaved'
                    ? 'border-red-600 bg-red-50'
                    : 'border-stone-200 hover:border-stone-300'
                }`}
              >
                <p className={`font-semibold text-sm ${contractMode === 'interleaved' ? 'text-red-700' : 'text-stone-800'}`}>
                  Oui — un par un
                </p>
                <p className="text-xs text-stone-500 mt-0.5">
                  À chaque main, un joueur choisit son prochain contrat. Puis c'est au suivant.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setContractMode('sequential')}
                className={`w-full text-left px-4 py-3 rounded-xl border-2 transition-all ${
                  contractMode === 'sequential'
                    ? 'border-red-600 bg-red-50'
                    : 'border-stone-200 hover:border-stone-300'
                }`}
              >
                <p className={`font-semibold text-sm ${contractMode === 'sequential' ? 'text-red-700' : 'text-stone-800'}`}>
                  Non — d'un coup
                </p>
                <p className="text-xs text-stone-500 mt-0.5">
                  Un joueur fait tous ses 7 contrats d'affilée, puis c'est au suivant.
                </p>
              </button>
            </div>
          </div>

          {error && (
            <div className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</div>
          )}

          <button
            type="submit"
            disabled={loading || contractMode === null}
            className="w-full py-3.5 bg-red-700 text-white font-semibold rounded-xl hover:bg-red-800 transition-colors disabled:opacity-50 text-base"
          >
            {loading ? 'Création...' : 'Commencer la partie →'}
          </button>
        </form>
      </main>
    </div>
  )
}

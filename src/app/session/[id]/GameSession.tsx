'use client'

import { useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Session, SessionPlayer, Round, RoundScore, Contract } from '@/lib/game'
import {
  CONTRACT_LABELS,
  CONTRACT_ICONS,
  CONTRACT_DESC,
  computeTotals,
  totalRounds,
  applyMeneurDoubling,
  getFirstRoundInfo,
} from '@/lib/game'
import ContractForm from './ContractForm'
import ContractPicker from './ContractPicker'
import Link from 'next/link'

interface Props {
  session: Session
  players: SessionPlayer[]
  initialRounds: Round[]
  initialScores: RoundScore[]
}

type ActiveStep = 'pick' | 'score' // en mode interleaved : d'abord choisir le contrat, puis saisir les scores

export default function GameSession({ session, players, initialRounds, initialScores }: Props) {
  const supabase = createClient()

  const [rounds, setRounds] = useState<Round[]>(initialRounds)
  const [scores, setScores] = useState<RoundScore[]>(initialScores)
  const [status, setStatus] = useState(session.status)
  const [savingStatus, setSavingStatus] = useState(false)
  const [activeStep, setActiveStep] = useState<ActiveStep | null>(null)
  const [drawDismissed, setDrawDismissed] = useState(false)

  const completedCount = rounds.filter((r) => r.completed_at).length
  const total = totalRounds(session.player_count)
  const progress = Math.round((completedCount / total) * 100)
  const totals = computeTotals(rounds, scores, session.player_count)
  const ranking = [...players].sort((a, b) => (totals[a.position] ?? 0) - (totals[b.position] ?? 0))

  // Tour actuel : premier round non complété
  const currentRound = rounds.find((r) => !r.completed_at) ?? null
  const meneur = currentRound ? players[currentRound.meneur_position] : null

  // Tirage au sort initial
  const drawInfo =
    session.first_drawer_position !== null && session.first_drawer_position !== undefined
      ? getFirstRoundInfo(players, session.first_drawer_position)
      : null
  const showDraw = drawInfo && completedCount === 0 && !drawDismissed

  // Sélection de contrat en mode interleaved
  async function handleContractPick(contract: Contract) {
    if (!currentRound) return
    const { error } = await supabase
      .from('rounds')
      .update({ contract })
      .eq('id', currentRound.id)
    if (error) { alert('Erreur réseau, réessayez.'); return }
    setRounds((prev) =>
      prev.map((r) => (r.id === currentRound.id ? { ...r, contract } : r))
    )
    setActiveStep('score')
  }

  // Validation des scores pour un tour
  const handleRoundComplete = useCallback(
    async (round: Round, rawScores: Record<number, number>) => {
      try {
        // Appliquer le doublement des points du meneur
        const finalScores = applyMeneurDoubling(
          rawScores,
          round.meneur_position,
          round.contract as Contract
        )

        const scoreRows = Object.entries(finalScores).map(([pos, score]) => ({
          round_id: round.id,
          player_position: parseInt(pos),
          score,
        }))

        const { data: insertedScores, error: scoresErr } = await supabase
          .from('round_scores')
          .upsert(scoreRows, { onConflict: 'round_id,player_position' })
          .select()
        if (scoresErr) throw scoresErr

        const completedAt = new Date().toISOString()
        const { error: roundErr } = await supabase
          .from('rounds')
          .update({ completed_at: completedAt })
          .eq('id', round.id)
        if (roundErr) throw roundErr

        setScores((prev) => [...prev.filter((s) => s.round_id !== round.id), ...(insertedScores ?? [])])
        setRounds((prev) => prev.map((r) => (r.id === round.id ? { ...r, completed_at: completedAt } : r)))
        setActiveStep(null)

        if (completedCount + 1 >= total) {
          await supabase.from('sessions').update({ status: 'completed' }).eq('id', session.id)
          setStatus('completed')
        }
      } catch (err) {
        console.error(err)
        alert('Erreur lors de la sauvegarde. Réessayez.')
      }
    },
    [supabase, session.id, completedCount, total]
  )

  async function togglePause() {
    setSavingStatus(true)
    const newStatus = status === 'paused' ? 'active' : 'paused'
    await supabase.from('sessions').update({ status: newStatus }).eq('id', session.id)
    setStatus(newStatus)
    setSavingStatus(false)
  }

  // Démarre la saisie pour le tour courant
  function startEntry() {
    if (!currentRound) return
    if (session.contract_mode === 'interleaved' && !currentRound.contract) {
      setActiveStep('pick')
    } else {
      setActiveStep('score')
    }
  }

  return (
    <div className="min-h-screen bg-stone-50 pb-44">
      {/* Header */}
      <header className="bg-white border-b border-stone-200 sticky top-0 z-20">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Link href="/dashboard" className="text-stone-500 hover:text-stone-800 text-lg mr-1">←</Link>
            <div>
              <h1 className="font-bold text-stone-900 text-sm leading-tight">{session.name}</h1>
              <p className="text-xs text-stone-500">{completedCount}/{total} contrats</p>
            </div>
          </div>
          {status !== 'completed' && (
            <button
              onClick={togglePause}
              disabled={savingStatus}
              className={`text-xs font-semibold px-3 py-1.5 rounded-full border transition-colors ${
                status === 'paused'
                  ? 'border-green-500 text-green-700 hover:bg-green-50'
                  : 'border-stone-300 text-stone-600 hover:bg-stone-50'
              }`}
            >
              {status === 'paused' ? '▶ Reprendre' : '⏸ Pause'}
            </button>
          )}
        </div>
        <div className="h-1 bg-stone-100">
          <div className="h-1 bg-red-600 transition-all duration-500" style={{ width: `${progress}%` }} />
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-4 space-y-4">

        {/* ── Tirage au sort initial ── */}
        {showDraw && drawInfo && (
          <div className="bg-white rounded-xl border-2 border-amber-300 p-4 relative">
            <div className="flex items-start gap-3">
              <span className="text-3xl">🎲</span>
              <div className="flex-1">
                <p className="font-bold text-stone-900 text-sm mb-2">Tirage au sort !</p>
                <div className="space-y-1.5">
                  <p className="text-sm text-stone-700">
                    <span className="text-stone-500">Désigné ·</span>{' '}
                    <strong>{drawInfo.drawer.name}</strong>
                  </p>
                  <p className="text-sm text-stone-700">
                    <span className="text-stone-500">Distribue les cartes ·</span>{' '}
                    <strong>{drawInfo.dealer.name}</strong>
                  </p>
                  <p className="text-sm text-stone-700">
                    <span className="text-stone-500">Joue en premier ·</span>{' '}
                    <strong>{drawInfo.firstPlayer.name}</strong>
                  </p>
                </div>
              </div>
            </div>
            <button
              onClick={() => setDrawDismissed(true)}
              className="mt-3 w-full py-2 bg-amber-500 text-white text-sm font-semibold rounded-lg hover:bg-amber-600 transition-colors"
            >
              C'est parti !
            </button>
          </div>
        )}

        {/* ── Partie terminée ── */}
        {status === 'completed' && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 text-center">
            <div className="text-4xl mb-2">🏆</div>
            <h2 className="font-bold text-stone-900 text-lg">Partie terminée !</h2>
            <p className="text-stone-600 text-sm mt-1">
              Bravo <strong>{ranking[0]?.name}</strong> avec {totals[ranking[0]?.position] ?? 0} pts !
            </p>
            <Link href="/dashboard"
              className="inline-block mt-4 px-5 py-2 bg-red-700 text-white text-sm font-semibold rounded-lg hover:bg-red-800">
              Retour à l'accueil
            </Link>
          </div>
        )}

        {/* ── En pause ── */}
        {status === 'paused' && (
          <div className="bg-stone-100 rounded-xl p-4 text-center">
            <p className="text-stone-600 font-medium">⏸ Partie en pause</p>
            <p className="text-xs text-stone-500 mt-1">Appuyez sur « Reprendre » pour continuer</p>
          </div>
        )}

        {/* ── Tour en cours ── */}
        {status === 'active' && currentRound && (
          <div className="bg-white rounded-xl border border-stone-200 overflow-hidden">
            {/* Header du tour */}
            <div className="px-4 py-3 border-b border-stone-100 bg-stone-50">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-stone-500 font-medium uppercase tracking-wide">
                    Meneur · {meneur?.name}
                  </p>
                  {currentRound.contract ? (
                    <>
                      <h2 className="font-bold text-stone-900 text-base mt-0.5 flex items-center gap-2">
                        <span>{CONTRACT_ICONS[currentRound.contract]}</span>
                        {CONTRACT_LABELS[currentRound.contract]}
                      </h2>
                      <p className="text-xs text-stone-500 mt-0.5">{CONTRACT_DESC[currentRound.contract]}</p>
                    </>
                  ) : (
                    <h2 className="font-bold text-stone-500 text-base mt-0.5 italic">
                      Contrat à choisir…
                    </h2>
                  )}
                </div>
                <span className="text-xs text-stone-400 tabular-nums">{completedCount + 1}/{total}</span>
              </div>

              {/* Rappel : points doublés pour le meneur */}
              {currentRound.contract && currentRound.contract !== 'reussite' && (
                <div className="mt-2 flex items-center gap-1.5 bg-red-50 rounded-lg px-2.5 py-1.5">
                  <span className="text-red-600 text-xs">⚡</span>
                  <p className="text-xs text-red-700 font-medium">
                    Les points de <strong>{meneur?.name}</strong> sont doublés ce tour
                  </p>
                </div>
              )}
            </div>

            {/* Étape 1 : choix du contrat (mode interleaved) */}
            {activeStep === 'pick' && meneur && (
              <ContractPicker
                meneur={meneur}
                rounds={rounds}
                onPick={handleContractPick}
              />
            )}

            {/* Étape 2 : saisie des scores */}
            {activeStep === 'score' && currentRound.contract && (
              <ContractForm
                round={currentRound}
                players={players}
                onSubmit={(s) => handleRoundComplete(currentRound, s)}
                onCancel={() => setActiveStep(null)}
              />
            )}

            {/* Bouton pour démarrer */}
            {!activeStep && (
              <div className="p-4">
                <button
                  onClick={startEntry}
                  className="w-full py-3 bg-red-700 text-white font-semibold rounded-lg hover:bg-red-800 transition-colors"
                >
                  {session.contract_mode === 'interleaved' && !currentRound.contract
                    ? `${meneur?.name}, choisir un contrat →`
                    : 'Saisir les scores →'}
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── Historique des tours joués ── */}
        {completedCount > 0 && (
          <CompletedRounds rounds={rounds} players={players} scores={scores} />
        )}

        {/* ── Prochains tours ── */}
        {status === 'active' && currentRound && (
          <UpcomingRounds rounds={rounds} players={players} currentRound={currentRound} />
        )}
      </main>

      {/* ── Tableau des scores fixe en bas ── */}
      <div className="fixed bottom-0 left-0 right-0 z-30 bg-white border-t-2 border-stone-200 shadow-lg">
        <div className="max-w-lg mx-auto">
          <div className="flex px-4 pt-2 pb-1 border-b border-stone-100">
            <span className="flex-1 text-xs font-semibold text-stone-500 uppercase tracking-wide">Joueur</span>
            <span className="text-xs font-semibold text-stone-500 uppercase tracking-wide">Score</span>
          </div>
          <div className="divide-y divide-stone-50">
            {ranking.map((player, i) => {
              const score = totals[player.position] ?? 0
              return (
                <div key={player.id} className="flex items-center px-4 py-1.5">
                  <span className="w-5 text-xs text-stone-400 mr-2">{i + 1}.</span>
                  <span className="flex-1 text-sm font-medium text-stone-800">{player.name}</span>
                  <span className={`font-bold text-sm tabular-nums ${
                    score < 0 ? 'text-green-600' : score > 0 ? 'text-red-600' : 'text-stone-400'
                  }`}>
                    {score > 0 ? `+${score}` : score}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Prochains tours ──
function UpcomingRounds({ rounds, players, currentRound }: { rounds: Round[]; players: SessionPlayer[]; currentRound: Round }) {
  const upcoming = rounds.filter((r) => !r.completed_at && r.id !== currentRound.id).slice(0, 5)
  if (upcoming.length === 0) return null
  return (
    <div>
      <h3 className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-2">Prochains tours</h3>
      <div className="space-y-1.5">
        {upcoming.map((r) => (
          <div key={r.id} className="flex items-center gap-3 bg-white rounded-lg px-3 py-2 border border-stone-100">
            <span className="text-base">{r.contract ? CONTRACT_ICONS[r.contract] : '?'}</span>
            <span className="flex-1 text-sm text-stone-700">
              {r.contract ? CONTRACT_LABELS[r.contract] : <span className="italic text-stone-400">À choisir</span>}
            </span>
            <span className="text-xs text-stone-400">{players[r.meneur_position]?.name}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Historique des tours joués ──
function CompletedRounds({ rounds, players, scores }: { rounds: Round[]; players: SessionPlayer[]; scores: RoundScore[] }) {
  const [open, setOpen] = useState(false)
  const completed = rounds.filter((r) => r.completed_at).reverse()
  if (completed.length === 0) return null
  return (
    <div>
      <button onClick={() => setOpen((o) => !o)}
        className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-2 flex items-center gap-1">
        Historique ({completed.length}) {open ? '▲' : '▼'}
      </button>
      {open && (
        <div className="space-y-2">
          {completed.map((r) => {
            const roundScores = scores.filter((s) => s.round_id === r.id)
            return (
              <div key={r.id} className="bg-white rounded-lg border border-stone-100 px-3 py-2.5">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-sm">{r.contract ? CONTRACT_ICONS[r.contract] : '?'}</span>
                  <span className="text-sm font-semibold text-stone-700">
                    {r.contract ? CONTRACT_LABELS[r.contract] : '—'}
                  </span>
                  <span className="text-xs text-stone-400 ml-auto">{players[r.meneur_position]?.name}</span>
                </div>
                <div className="flex gap-3 flex-wrap">
                  {roundScores.map((s) => (
                    <span key={s.id} className="text-xs text-stone-600">
                      {players[s.player_position]?.name}{' '}
                      <span className={s.score > 0 ? 'text-red-600 font-semibold' : s.score < 0 ? 'text-green-600 font-semibold' : 'text-stone-400'}>
                        {s.score > 0 ? `+${s.score}` : s.score}
                      </span>
                    </span>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

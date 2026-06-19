'use client'

import { useState } from 'react'
import type { Round, SessionPlayer } from '@/lib/game'
import { validateScores, getTrickCount } from '@/lib/game'

interface Props {
  round: Round
  players: SessionPlayer[]
  onSubmit: (scores: Record<number, number>) => void
  onCancel: () => void
}

export default function ContractForm({ round, players, onSubmit, onCancel }: Props) {
  const playerCount = players.length
  const trickCount = getTrickCount(playerCount)

  switch (round.contract) {
    case 'barbu':
    case 'dernier':
      return (
        <SinglePickForm
          round={round}
          players={players}
          value={round.contract === 'barbu' ? 80 : 80}
          label={round.contract === 'barbu' ? 'Qui a pris le Roi de Cœur ?' : 'Qui a pris le dernier pli ?'}
          onSubmit={onSubmit}
          onCancel={onCancel}
        />
      )
    case 'coeurs':
      return (
        <CountForm
          round={round}
          players={players}
          label="Nombre de cœurs ramassés"
          unit="cœur(s)"
          multiplier={10}
          total={trickCount}
          maxPerPlayer={trickCount}
          onSubmit={onSubmit}
          onCancel={onCancel}
        />
      )
    case 'dames':
      return (
        <CountForm
          round={round}
          players={players}
          label="Nombre de dames ramassées"
          unit="dame(s)"
          multiplier={20}
          total={4}
          maxPerPlayer={4}
          onSubmit={onSubmit}
          onCancel={onCancel}
        />
      )
    case 'plis':
      return (
        <CountForm
          round={round}
          players={players}
          label="Nombre de plis remportés"
          unit="pli(s)"
          multiplier={10}
          total={trickCount}
          maxPerPlayer={trickCount}
          onSubmit={onSubmit}
          onCancel={onCancel}
        />
      )
    case 'salade':
      return (
        <SaladeForm
          round={round}
          players={players}
          trickCount={trickCount}
          onSubmit={onSubmit}
          onCancel={onCancel}
        />
      )
    case 'reussite':
      return (
        <ReussiteForm
          round={round}
          players={players}
          onSubmit={onSubmit}
          onCancel={onCancel}
        />
      )
    default:
      return null
  }
}

// ============================================================
// Formulaire : un seul joueur prend tout (Barbu, Dernier)
// ============================================================
function SinglePickForm({
  players,
  round,
  value,
  label,
  onSubmit,
  onCancel,
}: {
  players: SessionPlayer[]
  round: Round
  value: number
  label: string
  onSubmit: (scores: Record<number, number>) => void
  onCancel: () => void
}) {
  const [selected, setSelected] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  function handleSubmit() {
    if (selected === null) {
      setError('Sélectionnez un joueur')
      return
    }
    const scores: Record<number, number> = {}
    players.forEach((p) => (scores[p.position] = 0))
    scores[selected] = value

    const err = validateScores(round.contract, scores, players.length)
    if (err) { setError(err); return }

    setSubmitting(true)
    onSubmit(scores)
  }

  return (
    <div className="p-4 space-y-3">
      <p className="text-sm font-medium text-stone-700">{label}</p>
      <div className="grid grid-cols-2 gap-2">
        {players.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => { setSelected(p.position); setError(null) }}
            className={`py-3 rounded-xl border-2 font-semibold text-sm transition-all ${
              selected === p.position
                ? 'border-red-600 bg-red-50 text-red-700'
                : 'border-stone-200 text-stone-700 hover:border-stone-300'
            }`}
          >
            {p.name}
            {selected === p.position && <span className="block text-xs font-normal mt-0.5">+{value} pts</span>}
          </button>
        ))}
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
      <FormActions onSubmit={handleSubmit} onCancel={onCancel} submitting={submitting} />
    </div>
  )
}

// ============================================================
// Formulaire : compteur par joueur (Cœurs, Dames, Plis)
// ============================================================
function CountForm({
  players,
  round,
  label,
  unit,
  multiplier,
  total,
  maxPerPlayer,
  onSubmit,
  onCancel,
}: {
  players: SessionPlayer[]
  round: Round
  label: string
  unit: string
  multiplier: number
  total: number
  maxPerPlayer: number
  onSubmit: (scores: Record<number, number>) => void
  onCancel: () => void
}) {
  const [counts, setCounts] = useState<Record<number, number>>(
    Object.fromEntries(players.map((p) => [p.position, 0]))
  )
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const currentSum = Object.values(counts).reduce((a, b) => a + b, 0)
  const remaining = total - currentSum

  function adjust(position: number, delta: number) {
    setCounts((prev) => {
      const cur = prev[position] ?? 0
      const next = Math.max(0, Math.min(maxPerPlayer, cur + delta))
      // Ne pas dépasser le total
      if (delta > 0 && currentSum >= total) return prev
      return { ...prev, [position]: next }
    })
    setError(null)
  }

  function handleSubmit() {
    if (remaining !== 0) {
      setError(`Il reste ${remaining} ${unit} à distribuer (total = ${total})`)
      return
    }
    const scores: Record<number, number> = {}
    players.forEach((p) => (scores[p.position] = (counts[p.position] ?? 0) * multiplier))

    const err = validateScores(round.contract, scores, players.length)
    if (err) { setError(err); return }

    setSubmitting(true)
    onSubmit(scores)
  }

  return (
    <div className="p-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-stone-700">{label}</p>
        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
          remaining === 0 ? 'bg-green-100 text-green-700' : 'bg-stone-100 text-stone-500'
        }`}>
          {remaining} restant{remaining !== 1 ? 's' : ''}
        </span>
      </div>

      <div className="space-y-2">
        {players.map((p) => {
          const count = counts[p.position] ?? 0
          return (
            <div key={p.id} className="flex items-center gap-3">
              <span className="flex-1 text-sm font-medium text-stone-800">{p.name}</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => adjust(p.position, -1)}
                  disabled={count === 0}
                  className="w-8 h-8 rounded-full border-2 border-stone-300 text-stone-600 font-bold text-lg flex items-center justify-center disabled:opacity-30 hover:border-stone-400 transition-colors"
                >
                  −
                </button>
                <span className="w-8 text-center font-bold text-stone-900 tabular-nums">{count}</span>
                <button
                  type="button"
                  onClick={() => adjust(p.position, 1)}
                  disabled={count >= maxPerPlayer || remaining === 0}
                  className="w-8 h-8 rounded-full border-2 border-stone-300 text-stone-600 font-bold text-lg flex items-center justify-center disabled:opacity-30 hover:border-stone-400 transition-colors"
                >
                  +
                </button>
                <span className="w-14 text-xs text-stone-500 tabular-nums text-right">
                  {count > 0 ? `+${count * multiplier} pts` : '—'}
                </span>
              </div>
            </div>
          )
        })}
      </div>

      {error && <p className="text-xs text-red-600">{error}</p>}
      <FormActions onSubmit={handleSubmit} onCancel={onCancel} submitting={submitting} disabled={remaining !== 0} />
    </div>
  )
}

// ============================================================
// Formulaire : La Salade (tous les contrats négatifs cumulés)
// ============================================================
function SaladeForm({
  players,
  round,
  trickCount,
  onSubmit,
  onCancel,
}: {
  players: SessionPlayer[]
  round: Round
  trickCount: number
  onSubmit: (scores: Record<number, number>) => void
  onCancel: () => void
}) {
  const [barbu, setBarbu] = useState<number | null>(null)
  const [hearts, setHearts] = useState<Record<number, number>>(
    Object.fromEntries(players.map((p) => [p.position, 0]))
  )
  const [queens, setQueens] = useState<Record<number, number>>(
    Object.fromEntries(players.map((p) => [p.position, 0]))
  )
  const [tricks, setTricks] = useState<Record<number, number>>(
    Object.fromEntries(players.map((p) => [p.position, 0]))
  )
  const [dernier, setDernier] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  function adjustCount(
    state: Record<number, number>,
    setState: (v: Record<number, number>) => void,
    position: number,
    delta: number,
    total: number,
    max: number
  ) {
    const cur = state[position] ?? 0
    const sum = Object.values(state).reduce((a, b) => a + b, 0)
    const next = Math.max(0, Math.min(max, cur + delta))
    if (delta > 0 && sum >= total) return
    setState({ ...state, [position]: next })
    setError(null)
  }

  const heartsSum = Object.values(hearts).reduce((a, b) => a + b, 0)
  const queensSum = Object.values(queens).reduce((a, b) => a + b, 0)
  const tricksSum = Object.values(tricks).reduce((a, b) => a + b, 0)

  function handleSubmit() {
    if (barbu === null) { setError('Sélectionnez qui a pris le Barbu'); return }
    if (dernier === null) { setError('Sélectionnez qui a pris le dernier pli'); return }
    if (heartsSum !== trickCount) { setError(`${trickCount} cœurs à distribuer (${heartsSum} distribués)`); return }
    if (queensSum !== 4) { setError(`4 dames à distribuer (${queensSum} distribuées)`); return }
    if (tricksSum !== trickCount) { setError(`${trickCount} plis à distribuer (${tricksSum} distribués)`); return }

    const scores: Record<number, number> = {}
    players.forEach((p) => {
      scores[p.position] =
        (p.position === barbu ? 80 : 0) +
        (hearts[p.position] ?? 0) * 10 +
        (queens[p.position] ?? 0) * 20 +
        (tricks[p.position] ?? 0) * 10 +
        (p.position === dernier ? 80 : 0)
    })

    setSubmitting(true)
    onSubmit(scores)
  }

  return (
    <div className="p-4 space-y-5">
      {/* Barbu */}
      <SaladePicker
        label="🃏 Qui a pris le Barbu ?"
        players={players}
        selected={barbu}
        onSelect={(pos) => { setBarbu(pos); setError(null) }}
        valueLabel="+80"
      />

      {/* Cœurs */}
      <SaladeCounter
        label={`♥ Cœurs (${heartsSum}/${trickCount})`}
        players={players}
        counts={hearts}
        onAdjust={(pos, d) => adjustCount(hearts, setHearts, pos, d, trickCount, trickCount)}
        multiplier={10}
        done={heartsSum === trickCount}
      />

      {/* Dames */}
      <SaladeCounter
        label={`♕ Dames (${queensSum}/4)`}
        players={players}
        counts={queens}
        onAdjust={(pos, d) => adjustCount(queens, setQueens, pos, d, 4, 4)}
        multiplier={20}
        done={queensSum === 4}
      />

      {/* Plis */}
      <SaladeCounter
        label={`🃏 Plis (${tricksSum}/${trickCount})`}
        players={players}
        counts={tricks}
        onAdjust={(pos, d) => adjustCount(tricks, setTricks, pos, d, trickCount, trickCount)}
        multiplier={10}
        done={tricksSum === trickCount}
      />

      {/* Dernier */}
      <SaladePicker
        label="⚑ Qui a pris le dernier pli ?"
        players={players}
        selected={dernier}
        onSelect={(pos) => { setDernier(pos); setError(null) }}
        valueLabel="+80"
      />

      {/* Preview des scores */}
      <div className="bg-stone-50 rounded-lg p-3">
        <p className="text-xs font-semibold text-stone-500 mb-2">Aperçu des scores</p>
        <div className="space-y-1">
          {players.map((p) => {
            const total =
              (p.position === barbu ? 80 : 0) +
              (hearts[p.position] ?? 0) * 10 +
              (queens[p.position] ?? 0) * 20 +
              (tricks[p.position] ?? 0) * 10 +
              (p.position === dernier ? 80 : 0)
            return (
              <div key={p.id} className="flex justify-between text-sm">
                <span className="text-stone-700">{p.name}</span>
                <span className={`font-bold tabular-nums ${total > 0 ? 'text-red-600' : 'text-stone-400'}`}>
                  {total > 0 ? `+${total}` : '0'}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      {error && <p className="text-xs text-red-600">{error}</p>}
      <FormActions onSubmit={handleSubmit} onCancel={onCancel} submitting={submitting} />
    </div>
  )
}

function SaladePicker({
  label,
  players,
  selected,
  onSelect,
  valueLabel,
}: {
  label: string
  players: SessionPlayer[]
  selected: number | null
  onSelect: (pos: number) => void
  valueLabel: string
}) {
  return (
    <div>
      <p className="text-xs font-semibold text-stone-600 mb-1.5">{label}</p>
      <div className="flex gap-1.5 flex-wrap">
        {players.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => onSelect(p.position)}
            className={`px-3 py-1.5 rounded-lg border-2 text-xs font-semibold transition-all ${
              selected === p.position
                ? 'border-red-600 bg-red-50 text-red-700'
                : 'border-stone-200 text-stone-700 hover:border-stone-300'
            }`}
          >
            {p.name} {selected === p.position ? valueLabel : ''}
          </button>
        ))}
      </div>
    </div>
  )
}

function SaladeCounter({
  label,
  players,
  counts,
  onAdjust,
  multiplier,
  done,
}: {
  label: string
  players: SessionPlayer[]
  counts: Record<number, number>
  onAdjust: (pos: number, delta: number) => void
  multiplier: number
  done: boolean
}) {
  return (
    <div>
      <p className={`text-xs font-semibold mb-1.5 ${done ? 'text-green-600' : 'text-stone-600'}`}>
        {label} {done ? '✓' : ''}
      </p>
      <div className="space-y-1.5">
        {players.map((p) => {
          const count = counts[p.position] ?? 0
          return (
            <div key={p.id} className="flex items-center gap-2">
              <span className="flex-1 text-xs text-stone-700">{p.name}</span>
              <button type="button" onClick={() => onAdjust(p.position, -1)} disabled={count === 0}
                className="w-6 h-6 rounded-full border border-stone-300 text-stone-600 text-sm flex items-center justify-center disabled:opacity-30">−</button>
              <span className="w-5 text-center text-xs font-bold">{count}</span>
              <button type="button" onClick={() => onAdjust(p.position, 1)}
                className="w-6 h-6 rounded-full border border-stone-300 text-stone-600 text-sm flex items-center justify-center disabled:opacity-30">+</button>
              <span className="w-12 text-right text-xs text-stone-500">{count > 0 ? `+${count * multiplier}` : '—'}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ============================================================
// Formulaire : La Réussite (1er = −200, 2ème = −100)
// ============================================================
function ReussiteForm({
  players,
  round,
  onSubmit,
  onCancel,
}: {
  players: SessionPlayer[]
  round: Round
  onSubmit: (scores: Record<number, number>) => void
  onCancel: () => void
}) {
  const [first, setFirst] = useState<number | null>(null)
  const [second, setSecond] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  function handleSubmit() {
    if (first === null) { setError('Sélectionnez le 1er joueur à finir'); return }
    if (second === null) { setError('Sélectionnez le 2ème joueur à finir'); return }
    if (first === second) { setError('1er et 2ème doivent être différents'); return }

    const scores: Record<number, number> = {}
    players.forEach((p) => (scores[p.position] = 0))
    scores[first] = -200
    scores[second] = -100

    const err = validateScores(round.contract, scores, players.length)
    if (err) { setError(err); return }

    setSubmitting(true)
    onSubmit(scores)
  }

  return (
    <div className="p-4 space-y-4">
      {/* 1er */}
      <div>
        <p className="text-sm font-medium text-stone-700 mb-2">
          ⭐ 1er à finir <span className="text-green-600 font-bold">−200 pts</span>
        </p>
        <div className="grid grid-cols-2 gap-2">
          {players.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => {
                setFirst(p.position)
                if (second === p.position) setSecond(null)
                setError(null)
              }}
              className={`py-2.5 rounded-xl border-2 text-sm font-semibold transition-all ${
                first === p.position
                  ? 'border-green-600 bg-green-50 text-green-700'
                  : second === p.position
                  ? 'opacity-40 cursor-not-allowed border-stone-200 text-stone-400'
                  : 'border-stone-200 text-stone-700 hover:border-stone-300'
              }`}
              disabled={second === p.position}
            >
              {p.name}
            </button>
          ))}
        </div>
      </div>

      {/* 2ème */}
      <div>
        <p className="text-sm font-medium text-stone-700 mb-2">
          🥈 2ème à finir <span className="text-green-500 font-bold">−100 pts</span>
        </p>
        <div className="grid grid-cols-2 gap-2">
          {players.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => {
                setSecond(p.position)
                setError(null)
              }}
              disabled={first === p.position}
              className={`py-2.5 rounded-xl border-2 text-sm font-semibold transition-all ${
                second === p.position
                  ? 'border-green-500 bg-green-50 text-green-600'
                  : first === p.position
                  ? 'opacity-40 cursor-not-allowed border-stone-200 text-stone-400'
                  : 'border-stone-200 text-stone-700 hover:border-stone-300'
              }`}
            >
              {p.name}
            </button>
          ))}
        </div>
      </div>

      {error && <p className="text-xs text-red-600">{error}</p>}
      <FormActions onSubmit={handleSubmit} onCancel={onCancel} submitting={submitting} />
    </div>
  )
}

// ============================================================
// Boutons de validation / annulation
// ============================================================
function FormActions({
  onSubmit,
  onCancel,
  submitting,
  disabled,
}: {
  onSubmit: () => void
  onCancel: () => void
  submitting: boolean
  disabled?: boolean
}) {
  return (
    <div className="flex gap-2 pt-1">
      <button
        type="button"
        onClick={onCancel}
        className="flex-1 py-2.5 border border-stone-300 text-stone-700 font-semibold rounded-lg text-sm hover:bg-stone-50 transition-colors"
      >
        Annuler
      </button>
      <button
        type="button"
        onClick={onSubmit}
        disabled={submitting || disabled}
        className="flex-1 py-2.5 bg-red-700 text-white font-semibold rounded-lg text-sm hover:bg-red-800 transition-colors disabled:opacity-50"
      >
        {submitting ? 'Sauvegarde...' : 'Valider ✓'}
      </button>
    </div>
  )
}

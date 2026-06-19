'use client'

import type { SessionPlayer } from '@/lib/game'

interface Props {
  players: SessionPlayer[]
  totals: Record<number, number>
  ranking: SessionPlayer[]
}

const MEDALS = ['🥇', '🥈', '🥉']

export default function ScoreBoard({ players, totals, ranking }: Props) {
  return (
    <div className="bg-white rounded-xl border border-stone-200 overflow-hidden">
      <div className="px-4 py-2.5 border-b border-stone-100 flex items-center justify-between">
        <h2 className="text-xs font-semibold text-stone-500 uppercase tracking-wide">Scores</h2>
        <span className="text-xs text-stone-400">Moins de points = mieux</span>
      </div>
      <div className="divide-y divide-stone-50">
        {ranking.map((player, rankIdx) => {
          const score = totals[player.position] ?? 0
          return (
            <div
              key={player.id}
              className={`flex items-center px-4 py-3 ${rankIdx === 0 ? 'bg-amber-50' : ''}`}
            >
              <span className="w-6 text-base mr-3">
                {rankIdx < 3 ? MEDALS[rankIdx] : <span className="text-stone-400 text-sm font-semibold">{rankIdx + 1}</span>}
              </span>
              <span className="flex-1 font-semibold text-stone-900 text-sm">{player.name}</span>
              <span
                className={`font-bold text-base tabular-nums ${
                  score < 0
                    ? 'text-green-600'
                    : score > 100
                    ? 'text-red-600'
                    : 'text-stone-800'
                }`}
              >
                {score > 0 ? `+${score}` : score}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

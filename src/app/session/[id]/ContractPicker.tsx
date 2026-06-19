'use client'

import { CONTRACT_LABELS, CONTRACT_ICONS, CONTRACT_DESC, CONTRACTS, type Contract, type Round, type SessionPlayer } from '@/lib/game'

interface Props {
  meneur: SessionPlayer
  rounds: Round[]
  onPick: (contract: Contract) => void
}

export default function ContractPicker({ meneur, rounds, onPick }: Props) {
  // Contrats déjà joués par ce meneur (parmi les rounds complétés)
  const played = new Set(
    rounds
      .filter((r) => r.meneur_position === meneur.position && r.completed_at && r.contract)
      .map((r) => r.contract as Contract)
  )

  const available = CONTRACTS.filter((c) => !played.has(c))

  return (
    <div className="p-4 space-y-3">
      <p className="text-sm font-semibold text-stone-700">
        <span className="text-stone-500 font-normal">Meneur · </span>{meneur.name}, quel contrat joues-tu ?
      </p>

      <div className="space-y-2">
        {CONTRACTS.map((c) => {
          const done = played.has(c)
          return (
            <button
              key={c}
              type="button"
              onClick={() => !done && onPick(c)}
              disabled={done}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 text-left transition-all ${
                done
                  ? 'border-stone-100 bg-stone-50 opacity-40 cursor-not-allowed'
                  : 'border-stone-200 hover:border-red-400 hover:bg-red-50 active:scale-[.98]'
              }`}
            >
              <span className="text-xl">{CONTRACT_ICONS[c]}</span>
              <div className="flex-1">
                <p className={`font-semibold text-sm ${done ? 'text-stone-400' : 'text-stone-900'}`}>
                  {CONTRACT_LABELS[c]}
                  {done && <span className="ml-2 text-xs font-normal text-stone-400">✓ joué</span>}
                </p>
                {!done && <p className="text-xs text-stone-500 mt-0.5">{CONTRACT_DESC[c]}</p>}
              </div>
              {!done && <span className="text-stone-300 text-lg">›</span>}
            </button>
          )
        })}
      </div>

      {available.length === 0 && (
        <p className="text-center text-sm text-stone-500 py-2">
          {meneur.name} a joué tous ses contrats !
        </p>
      )}
    </div>
  )
}

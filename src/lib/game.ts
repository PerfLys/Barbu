// ============================================================
// Logique du jeu du Barbu
// ============================================================

export const CONTRACTS = [
  'barbu',
  'coeurs',
  'dames',
  'plis',
  'dernier',
  'salade',
  'reussite',
] as const

export type Contract = (typeof CONTRACTS)[number]
export type ContractMode = 'sequential' | 'interleaved'

export const CONTRACT_LABELS: Record<Contract, string> = {
  barbu: 'Le Barbu',
  coeurs: 'Pas de Cœurs',
  dames: 'Pas de Dames',
  plis: 'Pas de Plis',
  dernier: 'Pas de Dernier',
  salade: 'La Salade',
  reussite: 'La Réussite',
}

export const CONTRACT_ICONS: Record<Contract, string> = {
  barbu: '♛',
  coeurs: '♥',
  dames: '♕',
  plis: '🃏',
  dernier: '⚑',
  salade: '🥗',
  reussite: '⭐',
}

export const CONTRACT_DESC: Record<Contract, string> = {
  barbu: 'Évitez le Roi de Cœur · +80 au preneur',
  coeurs: 'Chaque cœur ramassé · +10 par cœur',
  dames: 'Chaque dame ramassée · +20 par dame',
  plis: 'Chaque levée ramassée · +10 par pli',
  dernier: 'Dernier pli remporté · +80',
  salade: 'Tous les contrats négatifs combinés',
  reussite: '1er à finir · −200 · 2ème · −100',
}

// Nombre de plis selon le nombre de joueurs
export function getTrickCount(playerCount: number): number {
  if (playerCount === 3) return 10
  return 8 // 4-6 joueurs
}

// ============================================================
// Génération des tours
// ============================================================

export function generateRounds(
  playerCount: number,
  mode: ContractMode
): Array<{ roundIndex: number; meneurPosition: number; contract: Contract | null }> {
  const rounds = []

  if (mode === 'sequential') {
    // Chaque joueur joue ses 7 contrats d'affilée (ordre fixe)
    for (let p = 0; p < playerCount; p++) {
      for (let c = 0; c < CONTRACTS.length; c++) {
        rounds.push({
          roundIndex: p * CONTRACTS.length + c,
          meneurPosition: p,
          contract: CONTRACTS[c] as Contract,
        })
      }
    }
  } else {
    // Mode interleaved : les joueurs se relaient, chacun choisit son contrat au moment de jouer
    // On génère playerCount × 7 tours, le meneur alterne : 0,1,2,...,n-1,0,1,2,...
    const total = playerCount * CONTRACTS.length
    for (let i = 0; i < total; i++) {
      rounds.push({
        roundIndex: i,
        meneurPosition: i % playerCount,
        contract: null, // choisi au moment de jouer
      })
    }
  }

  return rounds
}

export function totalRounds(playerCount: number): number {
  return playerCount * CONTRACTS.length
}

// Contrats déjà joués par un joueur dans une session
export function playedContractsByPlayer(
  rounds: Round[],
  meneurPosition: number
): Contract[] {
  return rounds
    .filter((r) => r.meneur_position === meneurPosition && r.completed_at && r.contract)
    .map((r) => r.contract as Contract)
}

// Contrats disponibles pour un joueur (ceux qu'il n'a pas encore joués)
export function availableContracts(rounds: Round[], meneurPosition: number): Contract[] {
  const played = playedContractsByPlayer(rounds, meneurPosition)
  return CONTRACTS.filter((c) => !played.includes(c))
}

// ============================================================
// Double des points du meneur
// Les points du meneur sont doublés pour tous les contrats sauf la Réussite
// ============================================================

export function applyMeneurDoubling(
  scores: Record<number, number>,
  meneurPosition: number,
  contract: Contract
): Record<number, number> {
  if (contract === 'reussite') return scores // Pas de doublement pour la Réussite
  return {
    ...scores,
    [meneurPosition]: (scores[meneurPosition] ?? 0) * 2,
  }
}

// ============================================================
// Tirage au sort initial
// ============================================================

// Retourne l'index du joueur tiré au sort
export function drawRandomPlayer(playerCount: number): number {
  return Math.floor(Math.random() * playerCount)
}

// Infos pour le premier tour : qui distribue et qui joue en premier
export function getFirstRoundInfo(
  players: SessionPlayer[],
  drawerPosition: number
): { drawer: SessionPlayer; dealer: SessionPlayer; firstPlayer: SessionPlayer } {
  const n = players.length
  const drawer = players[drawerPosition]
  // Sens inverse des aiguilles d'une montre = position suivante dans le tableau
  // La personne AVANT (dans le sens CCW) distribue = (drawer - 1 + n) % n
  const dealerPos = (drawerPosition - 1 + n) % n
  // La personne APRÈS joue en premier = (drawer + 1) % n
  const firstPlayerPos = (drawerPosition + 1) % n
  return {
    drawer,
    dealer: players[dealerPos],
    firstPlayer: players[firstPlayerPos],
  }
}

// ============================================================
// Types de base de données
// ============================================================

export type SessionStatus = 'active' | 'paused' | 'completed'

export interface Session {
  id: string
  owner_id: string
  name: string
  player_count: number
  status: SessionStatus
  contract_mode: ContractMode
  first_drawer_position: number | null
  created_at: string
  updated_at: string
}

export interface SessionPlayer {
  id: string
  session_id: string
  name: string
  position: number
}

export interface Round {
  id: string
  session_id: string
  round_index: number
  meneur_position: number
  contract: Contract | null
  completed_at: string | null
}

export interface RoundScore {
  id: string
  round_id: string
  player_position: number
  score: number
}

// ============================================================
// Calcul des scores
// ============================================================

export function computeTotals(
  rounds: Round[],
  scores: RoundScore[],
  playerCount: number
): Record<number, number> {
  const totals: Record<number, number> = {}
  for (let i = 0; i < playerCount; i++) totals[i] = 0
  for (const s of scores) {
    totals[s.player_position] = (totals[s.player_position] ?? 0) + s.score
  }
  return totals
}

// ============================================================
// Validation des scores saisis
// ============================================================

export function validateScores(
  contract: Contract,
  scores: Record<number, number>,
  playerCount: number
): string | null {
  const vals = Object.values(scores)
  const sum = vals.reduce((a, b) => a + b, 0)
  const trickCount = getTrickCount(playerCount)

  switch (contract) {
    case 'barbu':
      if (sum !== 80) return 'Le total doit être 80 (un seul joueur prend le Roi de Cœur)'
      if (!vals.every((v) => v === 0 || v === 80)) return 'Scores invalides : 0 ou 80 uniquement'
      break
    case 'coeurs':
      if (sum !== trickCount * 10)
        return `Le total doit être ${trickCount * 10} (${trickCount} cœurs × 10)`
      if (!vals.every((v) => v >= 0 && v % 10 === 0)) return 'Chaque score doit être un multiple de 10'
      break
    case 'dames':
      if (sum !== 80) return 'Le total doit être 80 (4 dames × 20)'
      if (!vals.every((v) => v >= 0 && v % 20 === 0)) return 'Chaque score doit être un multiple de 20'
      break
    case 'plis':
      if (sum !== trickCount * 10)
        return `Le total doit être ${trickCount * 10} (${trickCount} plis × 10)`
      if (!vals.every((v) => v >= 0 && v % 10 === 0)) return 'Chaque score doit être un multiple de 10'
      break
    case 'dernier':
      if (sum !== 80) return 'Le total doit être 80 (un seul joueur prend le dernier pli)'
      if (!vals.every((v) => v === 0 || v === 80)) return 'Scores invalides : 0 ou 80 uniquement'
      break
    case 'salade':
      if (vals.some((v) => v < 0)) return 'La Salade ne donne que des points positifs'
      break
    case 'reussite':
      if (sum !== -300) return 'Le total doit être −300 (−200 + −100)'
      if (!vals.every((v) => v === 0 || v === -200 || v === -100))
        return 'Scores invalides : 0, −100 ou −200 uniquement'
      break
  }
  return null
}

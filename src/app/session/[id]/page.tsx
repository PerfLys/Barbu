import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import GameSession from './GameSession'
import type { Session, SessionPlayer, Round, RoundScore } from '@/lib/game'

interface Props {
  params: Promise<{ id: string }>
}

export default async function SessionPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: session }, { data: players }, { data: rounds }] = await Promise.all([
    supabase.from('sessions').select('*').eq('id', id).single(),
    supabase.from('session_players').select('*').eq('session_id', id).order('position'),
    supabase.from('rounds').select('*').eq('session_id', id).order('round_index'),
  ])

  // Récupère les scores via les round_ids de cette session
  const roundIds = (rounds ?? []).map((r: Round) => r.id)
  const { data: scores } = roundIds.length > 0
    ? await supabase.from('round_scores').select('*').in('round_id', roundIds)
    : { data: [] }

  if (!session) notFound()
  if (session.owner_id !== user.id) redirect('/dashboard')

  return (
    <GameSession
      session={session as Session}
      players={(players ?? []) as SessionPlayer[]}
      initialRounds={(rounds ?? []) as Round[]}
      initialScores={(scores ?? []) as RoundScore[]}
    />
  )
}

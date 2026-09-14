import { supabase } from '../lib/supabase'
import { validateGrade, type WeeklyGrade } from '../lib/weeklyReports'

const LOCAL_KEY = 'fai:weekly-grades:v1'
function localCards(): WeeklyGrade[] {
  const raw = localStorage.getItem(LOCAL_KEY)
  if (!raw) return []
  const rows: unknown = JSON.parse(raw)
  if (!Array.isArray(rows)) throw new Error('The saved report data could not be read.')
  rows.forEach(row => validateGrade(row as WeeklyGrade))
  return rows as WeeklyGrade[]
}
function fromRow(row: Record<string, unknown>): WeeklyGrade {
  const card = { ...(row.payload as WeeklyGrade), id: String(row.id), revision: Number(row.revision) }
  validateGrade(card)
  return card
}
export async function loadWeeklyGrades(teamId?: string): Promise<WeeklyGrade[]> {
  if (!supabase) return localCards()
  if (!teamId) throw new Error('Select a team before opening reports.')
  const { data, error } = await supabase.from('weekly_grades').select('id,payload,revision').eq('team_id', teamId).order('updated_at', { ascending: false })
  if (error) throw new Error('Could not load weekly reports: ' + error.message)
  return (data ?? []).map(row => fromRow(row as Record<string, unknown>))
}
/** Individual rows with optimistic locking prevent one coach replacing another's work. */
export async function saveWeeklyGrade(card: WeeklyGrade, teamId?: string): Promise<WeeklyGrade> {
  validateGrade(card)
  const next = { ...card, opponent: card.opponent.trim(), revision: card.revision + 1 }
  if (!supabase) {
    const rows = localCards()
    const current = rows.find(row => row.id === card.id)
    if ((current?.revision ?? 0) !== card.revision) throw new Error('This report changed in another tab. Reload reports before editing.')
    if (rows.some(row => row.id !== card.id && row.athleteId === card.athleteId && row.positionGroup === card.positionGroup && row.date === card.date && row.opponent.trim().toLowerCase() === card.opponent.trim().toLowerCase())) throw new Error('This athlete already has a report for that game and position. Open the saved report.')
    localStorage.setItem(LOCAL_KEY, JSON.stringify([...rows.filter(row => row.id !== card.id), next]))
    return next
  }
  if (!teamId) throw new Error('Select a team before saving.')
  const row = { team_id: teamId, id: next.id, athlete_id: next.athleteId, position_group: next.positionGroup, game_date: next.date, opponent_key: next.opponent.toLowerCase(), payload: next, revision: next.revision, updated_at: new Date().toISOString() }
  const query = card.revision === 0
    ? supabase.from('weekly_grades').insert(row)
    : supabase.from('weekly_grades').update(row).eq('team_id', teamId).eq('id', card.id).eq('revision', card.revision)
  const { data, error } = await query.select('id,payload,revision').maybeSingle()
  if (error) throw new Error(error.code === '23505' ? 'This athlete already has a report for that game and position. Reload reports and open it.' : 'Could not save report: ' + error.message)
  if (!data) throw new Error('This report changed or your access changed. Reload reports before editing.')
  return fromRow(data as Record<string, unknown>)
}

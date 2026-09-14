import type { FilmPlay, PositionGroup } from '../types'

export const REPORT_GROUPS: PositionGroup[] = ['QB', 'RB', 'WR', 'TE', 'OL', 'DL', 'LB', 'DB', 'K/P', 'ATH']
export interface GradeCriterion { label: string; score: number | null }
export interface WeeklyGrade {
  id: string
  athleteId: string
  athleteName: string
  positionGroup: PositionGroup
  date: string
  opponent: string
  coach: string
  criteria: GradeCriterion[]
  notes: string
  focus: string
  revision: number
}
const POSITION_CRITERIA: Record<PositionGroup, string[]> = {
  QB: ['Read / decision', 'Accuracy', 'Pocket footwork', 'Ball security'],
  RB: ['Read / track', 'Ball security', 'Pass protection', 'Finish'],
  WR: ['Release', 'Route / separation', 'Catch execution', 'Blocking'],
  TE: ['Assignment', 'Route execution', 'Catch execution', 'Blocking'],
  OL: ['Assignment', 'First step / leverage', 'Hands / sustain', 'Finish'],
  DL: ['Gap integrity', 'Get-off', 'Block destruction', 'Pursuit / finish'],
  LB: ['Read / fit', 'Block defeat', 'Coverage', 'Tackling'],
  DB: ['Alignment / leverage', 'Eyes / assignment', 'Coverage technique', 'Tackling / finish'],
  'K/P': ['Operation', 'Placement', 'Technique', 'Situational execution'],
  ATH: ['Assignment', 'Technique', 'Effort', 'Finish'],
}
export function defaultCriteria(group: PositionGroup): GradeCriterion[] {
  return POSITION_CRITERIA[group].map(label => ({ label, score: null }))
}
export function gradePercent(criteria: GradeCriterion[]): number | null {
  const rated = criteria.filter((c): c is GradeCriterion & { score: number } => typeof c.score === 'number' && Number.isFinite(c.score) && c.score >= 0 && c.score <= 2)
  return rated.length ? Math.round(rated.reduce((n, c) => n + c.score, 0) / (rated.length * 2) * 100) : null
}
export function normalizedOpponent(value: string): string { return value.trim().toLowerCase() }
export function sameReportGame(card: WeeklyGrade, date: string, opponent: string): boolean {
  return card.date === date && normalizedOpponent(card.opponent) === normalizedOpponent(opponent)
}
export function validateGrade(card: WeeklyGrade): void {
  if (!card.id || !card.athleteId || !card.athleteName.trim()) throw new Error('Choose a rostered athlete.')
  if (!REPORT_GROUPS.includes(card.positionGroup)) throw new Error('Choose a position group.')
  if (!/^\d{4}-\d{2}-\d{2}$/.test(card.date) || !Number.isFinite(Date.parse(card.date)) || new Date(card.date).toISOString().slice(0, 10) !== card.date) throw new Error('Choose a valid game date.')
  if (!card.opponent.trim()) throw new Error('Enter an opponent.')
  if (!card.coach.trim()) throw new Error('Enter the grading coach.')
  if (card.criteria.length < 1 || card.criteria.length > 12) throw new Error('Use between 1 and 12 criteria.')
  if (card.criteria.some(c => !c.label.trim() || (c.score !== null && ![0, 1, 2].includes(c.score)))) throw new Error('Each criterion needs a label and a 0, 1, 2, or N/A grade.')
  if (new Set(card.criteria.map(c => c.label.trim().toLowerCase())).size !== card.criteria.length) throw new Error('Give each criterion a different label.')
  if (gradePercent(card.criteria) === null) throw new Error('Grade at least one criterion before saving.')
  if (!Number.isInteger(card.revision) || card.revision < 0) throw new Error('Invalid report revision.')
}
export interface Situation {
  label: string; count: number; run: number; pass: number; rpo: number; unknown: number; topConcept: string
}
function summarize(label: string, plays: FilmPlay[]): Situation {
  const concepts = new Map<string, number>()
  for (const p of plays) if (p.concept?.trim()) concepts.set(p.concept, (concepts.get(p.concept) ?? 0) + 1)
  const top = [...concepts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0]
  return {
    label, count: plays.length,
    run: plays.filter(p => p.call === 'run').length,
    pass: plays.filter(p => p.call === 'pass' || p.call === 'screen').length,
    rpo: plays.filter(p => p.call === 'rpo').length,
    unknown: plays.filter(p => !p.call).length,
    topConcept: top ? top[0] + ' (' + top[1] + '/' + plays.length + ')' : 'No concept tagged',
  }
}
/** Input is explicitly selected source film. RPO and untagged calls remain separate. */
export function weeklySituations(input: FilmPlay[]): Situation[] {
  const plays = input.filter(p => p.call !== 'special' && p.side !== 'special')
  const rows: Array<[string, FilmPlay[]]> = [
    ['All selected snaps', plays],
    ['1st down', plays.filter(p => p.down === 1)],
    ['2nd down', plays.filter(p => p.down === 2)],
    ['3rd & short (0–3)', plays.filter(p => p.down === 3 && p.distance !== undefined && p.distance >= 0 && p.distance <= 3)],
    ['3rd & medium (4–6)', plays.filter(p => p.down === 3 && p.distance !== undefined && p.distance > 3 && p.distance <= 6)],
    ['3rd & long (7+)', plays.filter(p => p.down === 3 && p.distance !== undefined && p.distance > 6)],
    ['4th down', plays.filter(p => p.down === 4)],
    ['Coming out (own 1–10)', plays.filter(p => p.yardLine !== undefined && p.yardLine >= 1 && p.yardLine <= 10)],
    ['Red zone (opp 20–1)', plays.filter(p => p.yardLine !== undefined && p.yardLine >= 80 && p.yardLine <= 99)],
  ]
  for (const formation of [...new Set(plays.map(p => p.formation).filter((s): s is string => Boolean(s)))].sort()) rows.push(['Formation: ' + formation, plays.filter(p => p.formation === formation)])
  return rows.map(([label, group]) => summarize(label, group))
}
export function countPercent(count: number, total: number): string {
  return total ? count + '/' + total + ' · ' + Math.round(count / total * 100) + '%' : '—'
}
export function escapeReportHtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;')
}
function csvCell(value: string | number): string {
  const text = String(value)
  const safe = /^[\s]*[=+@-]/.test(text) ? "'" + text : text
  return '"' + safe.replace(/"/g, '""') + '"'
}
export function weeklyGradesCsv(cards: WeeklyGrade[]): string {
  const rows: Array<Array<string | number>> = [['Date', 'Opponent', 'Athlete', 'Position', 'Coach', 'Grade %', 'Criterion', 'Score (0–2)', 'Player feedback', 'Next practice focus']]
  for (const card of cards) for (const criterion of card.criteria) rows.push([card.date, card.opponent, card.athleteName, card.positionGroup, card.coach, gradePercent(card.criteria) ?? '', criterion.label, criterion.score ?? 'N/A', card.notes, card.focus])
  return '\uFEFF' + rows.map(row => row.map(csvCell).join(',')).join('\r\n')
}
export function weeklyPacketHtml(team: string, date: string, opponent: string, cards: WeeklyGrade[], situations: Situation[], sourceLabel: string): string {
  const e = escapeReportHtml
  const positionSummary = REPORT_GROUPS.map(group => {
    const groupCards = cards.filter(c => c.positionGroup === group)
    const scores = groupCards.map(c => gradePercent(c.criteria)).filter((n): n is number => n !== null)
    return scores.length ? '<tr><td>' + e(group) + '</td><td>' + scores.length + '</td><td>' + Math.round(scores.reduce((n, v) => n + v, 0) / scores.length) + '%</td></tr>' : ''
  }).join('')
  const playerPages = cards.map(card => '<section class="player"><p class="eyebrow">PLAYER REPORT · ' + e(team) + '</p><h1>' + e(card.athleteName) + '</h1><p>' + e(card.positionGroup + ' · ' + card.date + ' vs ' + card.opponent + ' · Coach: ' + card.coach) + '</p><h2>' + (gradePercent(card.criteria) ?? '—') + '% execution grade</h2><table><thead><tr><th>Criterion</th><th>Score</th></tr></thead><tbody>' + card.criteria.map(c => '<tr><td>' + e(c.label) + '</td><td>' + (c.score === null ? 'N/A' : c.score + '/2') + '</td></tr>').join('') + '</tbody></table><h2>Coach feedback</h2><p class="notes">' + e(card.notes || 'No feedback entered.') + '</p><h2>Next practice focus</h2><p class="notes">' + e(card.focus || 'No focus entered.') + '</p><p class="muted">0 = missed · 1 = inconsistent · 2 = executed. N/A excluded. Equal-weight coach evaluation; not an automatic film or athletic ability score.</p></section>').join('')
  const scouting = situations.length ? '<section class="player"><p class="eyebrow">STAFF SCOUTING SHEET</p><h1>Situational tendencies</h1><p>Selected film: ' + e(sourceLabel) + '</p><p class="muted">Confirm the selected film charts the offense you are scouting. Field position is from that offense’s perspective. Pass includes screens; RPO and unknown calls remain separate. Under 10 snaps is a small sample.</p><table><thead><tr><th>Situation</th><th>N</th><th>Run</th><th>Pass</th><th>RPO</th><th>Unknown</th><th>Top concept</th></tr></thead><tbody>' + situations.map(s => '<tr><td>' + e(s.label) + (s.count > 0 && s.count < 10 ? ' *' : '') + '</td><td>' + s.count + '</td><td>' + e(countPercent(s.run, s.count)) + '</td><td>' + e(countPercent(s.pass, s.count)) + '</td><td>' + e(countPercent(s.rpo, s.count)) + '</td><td>' + e(countPercent(s.unknown, s.count)) + '</td><td>' + e(s.topConcept) + '</td></tr>').join('') + '</tbody></table><p>* Small sample. Situation rows overlap and should not be added together.</p></section>' : ''
  return '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>' + e(team + ' · Weekly reports') + '</title><style>body{font:15px/1.55 system-ui,sans-serif;color:#152526;background:#f2f5f3;margin:0}main{max-width:1000px;margin:auto;padding:32px}h1{font-size:34px;line-height:1.15}h2{font-size:18px;margin-top:28px}.eyebrow{letter-spacing:2px;font-size:12px;font-weight:800;color:#286b5a}section{background:white;padding:30px;margin:24px 0;border-top:5px solid #286b5a}table{width:100%;border-collapse:collapse;font-size:13px}th,td{text-align:left;border-bottom:1px solid #d4dcd8;padding:9px;overflow-wrap:anywhere}th{background:#edf3ef}.muted{font-size:12px;color:#52625c}.notes{white-space:pre-wrap}button{background:#173c32;color:white;border:0;border-radius:8px;padding:12px;font:inherit;cursor:pointer}@media print{body{background:white}main{padding:0}button{display:none}section{border:0;margin:0;padding:10mm}.player{break-before:page}tr{break-inside:avoid}thead{display:table-header-group}@page{size:auto;margin:10mm}</style></head><body><main><button onclick="window.print()">Print / Save as PDF</button><section><p class="eyebrow">FAI · WEEKLY COACH REPORTS</p><h1>' + e(team) + '</h1><p>' + e(date + ' · ' + opponent) + '</p><h2>' + cards.length + ' saved player evaluations</h2><table><thead><tr><th>Position</th><th>Evaluations</th><th>Average grade</th></tr></thead><tbody>' + positionSummary + '</tbody></table><p class="muted">Position averages give each evaluation equal weight. Different custom criteria may not be directly comparable. Only saved evaluations are included. Staff packet: distribute individual player pages separately.</p></section>' + playerPages + scouting + '</main></body></html>'
}

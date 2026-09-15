import { useRef, useState } from 'react'
import type { Athlete, PlayerGameStat, StatKey } from '../types'
import { useStore } from '../store/useStore'
import { Card, Pill, SectionTitle } from './ui'
import { STAT_LABEL, buildAthleteSeasonStats, statFieldsForPosition } from '../lib/playerStats'
import { gameStatsAdjustment, sameStatGame, validateGameStats } from '../lib/gameStatEntry'
import StatSheetImport from './StatSheetImport'

const inputClass = 'w-full min-w-0 rounded-lg border border-line bg-panel px-3 py-2.5 text-base font-semibold text-chalk outline-none focus:border-fai'
const today = () => new Date().toISOString().slice(0, 10)

export default function PlayerStatsCard({ athlete }: { athlete: Athlete }) {
  const { data, canEdit, saveStatus, saveError, savePlayerStat, removePlayerStat, resultByAthlete } = useStore()
  const formRef = useRef<HTMLFormElement>(null)
  const defaultFields = [...new Set([...statFieldsForPosition(athlete.positionGroup), ...(athlete.secondaryPositionGroup ? statFieldsForPosition(athlete.secondaryPositionGroup) : [])])]
  const [allFields, setAllFields] = useState(false)
  const [date, setDate] = useState(today())
  const [opponent, setOpponent] = useState('')
  const [values, setValues] = useState<Partial<Record<StatKey, string>>>({})
  const [editingId, setEditingId] = useState<string>()
  const [message, setMessage] = useState('')
  const [deleteId, setDeleteId] = useState<string>()
  const [showHistory, setShowHistory] = useState(false)
  const fields = allFields ? Object.keys(STAT_LABEL) as StatKey[] : [...new Set([...defaultFields, ...Object.keys(values) as StatKey[]])]
  const ownGames = data.playerStats.filter(stat => stat.athleteId === athlete.id).sort((a, b) => b.date.localeCompare(a.date))
  const season = buildAthleteSeasonStats(athlete.id, data.playerStats)
  const adjustment = gameStatsAdjustment(athlete.id, data.playerStats)
  const rating = resultByAthlete.get(athlete.id)
  function reset() { setEditingId(undefined); setValues({}); setMessage('Ready for the next game. Set its date and opponent.'); }
  function edit(game: PlayerGameStat) {
    setEditingId(game.id); setDate(game.date); setOpponent(game.opponent ?? '')
    setValues(Object.fromEntries(Object.entries(game.stats).map(([key, value]) => [key, String(value)])))
    setMessage('Editing this saved game. Blank a field to remove an unknown stat; enter 0 for a confirmed zero.')
    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
  function save() {
    const stats = Object.fromEntries(Object.entries(values).filter(([, value]) => value?.trim() !== '').map(([key, value]) => [key, Number(value)])) as Partial<Record<StatKey, number>>
    const error = validateGameStats(stats)
    if (error) { setMessage(error); return }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !opponent.trim()) { setMessage('Choose a game date and opponent.'); return }
    const duplicate = ownGames.find(game => game.id !== editingId && sameStatGame(game, { athleteId: athlete.id, date, opponent }))
    if (duplicate) { setMessage('That game is already saved. Open it from Recent games to make corrections.'); return }
    const id = savePlayerStat({ id: editingId, athleteId: athlete.id, date, opponent: opponent.trim(), stats })
    setEditingId(id); setMessage('Game saved. Rating updated. Choose Add another game to enter the next one.')
  }
  return <Card className="p-4 sm:p-5">
    <SectionTitle right={<span className="text-xs font-bold text-muted">{season.games} saved games</span>}>Game Stats</SectionTitle>
    <div className="mt-3 rounded-xl border border-fai/25 bg-fai/5 p-3">
      <div className="flex flex-wrap items-center gap-3"><strong>{athlete.name}</strong>{rating && <Pill tone="fai">Overall {rating.current.fai.toFixed(1)}</Pill>}<span className="text-sm">Game adjustment: {adjustment ? `${adjustment.boostPct > 0 ? '+' : ''}${adjustment.boostPct}%` : 'Waiting for paired stats'}</span></div>
      {adjustment?.signals.map(signal => <div key={signal} className="mt-1 text-xs text-muted">{signal}</div>)}
      <details className="mt-2 text-xs text-muted"><summary className="cursor-pointer font-bold">How games change the overall</summary><p className="mt-2">The latest three saved games contribute a maximum ±5% of tested FAI. Neutral targets: 60% completions, 65% catches, 4 yards/carry, 85% tackle completion. Full sample: 30 pass attempts, 15 targets, 20 carries, or 20 tackle opportunities. Smaller samples have less influence. Available rates are averaged; blanks never mean zero.</p><p className="mt-2">The swing reaches ±5% at ±20 completion percentage points, ±25 catch percentage points, ±3 yards/carry, or ±15 tackle percentage points from neutral, with a full sample. These are FAI coaching settings. Paired box scores replace the impact-event efficiency adjustment; existing impact and awareness bonuses still apply. Overall stays between 0 and 100. Testing is required for a rating.</p></details>
    </div>
    {canEdit && <>
      <StatSheetImport playerName={athlete.name} onApply={incoming => { setValues(previous => ({ ...previous, ...incoming })); setMessage('Review imported numbers, date, and opponent below, then Save game.') }} />
      <form ref={formRef} onSubmit={event => { event.preventDefault(); save() }} className="mt-4 scroll-mt-4 rounded-xl border border-line bg-panel-2/25 p-3">
        <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="font-black">{editingId ? 'Edit game' : 'Add a game'}</h3>{editingId && <button type="button" onClick={reset} className="rounded-lg border border-line px-3 py-2 text-sm font-bold">Add another game</button>}</div>
        <div className="mt-3 grid gap-3 sm:grid-cols-2"><label className="text-xs font-bold">Game date<input required type="date" value={date} onChange={e => setDate(e.target.value)} className={inputClass} /></label><label className="text-xs font-bold">Opponent<input required value={opponent} onChange={e => setOpponent(e.target.value)} placeholder="School / team" className={inputClass} /></label></div>
        <p className="mt-3 text-xs text-muted">Leave unknown stats blank. Enter 0 when confirmed. Include missed tackles to calculate tackle efficiency.</p>
        <label className="mt-3 flex items-center gap-2 text-sm"><input type="checkbox" checked={allFields} onChange={e => setAllFields(e.target.checked)} />Show all offense and defense stats</label>
        {!fields.length && <p className="mt-2 text-sm text-muted">No standard box-score fields for this position. Show all stats to record any offense or defense work.</p>}
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">{fields.map(key => <label key={key} className={`text-xs font-bold ${key === 'missedTackles' ? 'text-fai' : 'text-muted'}`}>{STAT_LABEL[key].label}<input type="number" inputMode="decimal" step={['tackles', 'sacks', 'tacklesForLoss'].includes(key) ? '.5' : '1'} min={['rushYds', 'recYds', 'passYds'].includes(key) ? undefined : 0} value={values[key] ?? ''} onChange={e => setValues(previous => ({ ...previous, [key]: e.target.value }))} className={inputClass} /></label>)}</div>
        <button type="submit" className="mt-4 w-full rounded-lg bg-fai px-4 py-3 text-sm font-black text-ink sm:w-auto">Save game</button>
        <p role="status" className="mt-2 text-sm text-muted">{saveStatus === 'saving' ? 'Saving game changes…' : saveStatus === 'error' ? 'Game update needs attention.' : message}</p>
        {saveError && <p role="alert" className="mt-2 text-sm text-down">{saveError}</p>}
      </form>
    </>}
    <div className="mt-5"><h3 className="font-black">Recent games</h3><p className="mt-1 text-xs text-muted">Latest three shown first. Edit a game to correct missed tackles or any other stat.</p>
      {!ownGames.length && <p className="mt-3 text-sm text-muted">No games saved yet.</p>}
      {(showHistory ? ownGames : ownGames.slice(0, 3)).map(game => <div key={game.id} className="mt-3 rounded-xl border border-line p-3"><div className="flex flex-wrap items-center justify-between gap-2"><div><strong>{game.opponent || 'Game'}</strong><div className="text-xs text-muted">{game.date}</div></div>{canEdit && <button type="button" onClick={() => edit(game)} className="rounded-lg border border-fai/40 px-4 py-2 text-sm font-black text-fai" aria-label={`Edit ${game.opponent} ${game.date}`}>Edit game</button>}</div><div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted">{Object.entries(game.stats).map(([key, value]) => <span key={key}>{STAT_LABEL[key as StatKey].label}: <strong>{value}</strong></span>)}</div>{canEdit && <div className="mt-2">{deleteId === game.id ? <div className="flex flex-wrap gap-3 text-xs"><span>Delete this game’s stats?</span><button type="button" className="text-down" onClick={() => { removePlayerStat(game.id); setDeleteId(undefined); if (editingId === game.id) reset() }}>Delete game</button><button type="button" onClick={() => setDeleteId(undefined)}>Keep game</button></div> : <button type="button" className="text-xs text-muted" onClick={() => setDeleteId(game.id)}>Remove game…</button>}</div>}</div>)}
      {ownGames.length > 3 && <button type="button" onClick={() => setShowHistory(!showHistory)} className="mt-3 text-sm font-bold text-fai">{showHistory ? 'Show latest three' : `Show all ${ownGames.length} games`}</button>}
    </div>
  </Card>
}

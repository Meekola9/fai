import { rosterForScope } from '../lib/rosterScope'
import { useState } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { useStore } from '../store/useStore'
import PlayerStatsCard from '../components/PlayerStatsCard'

export default function GameStats() {
  const { data } = useStore()
  const [params, setParams] = useSearchParams()
  const [search, setSearch] = useState('')
  const athlete = data.athletes.find(a => a.id === params.get('athlete'))
  const roster = rosterForScope(data.athletes, data.sessions).filter(a => a.name.toLowerCase().includes(search.toLowerCase())).sort((a, b) => a.name.localeCompare(b.name))
  return <div className="space-y-4">
    <div><h1 className="text-3xl font-black">Game Stats</h1><p className="mt-2 text-sm text-muted">Choose a player, enter a game, or upload a stat sheet. Open any saved game to correct it.</p></div>
    <div className="grid gap-3 rounded-xl border border-line bg-panel p-4 sm:grid-cols-2">
      <label className="text-sm font-bold">Find player<input className="mt-1 w-full rounded-lg border border-line bg-ink p-3" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name" /></label>
      <label className="text-sm font-bold">Player<select aria-label="Player" className="mt-1 w-full rounded-lg border border-line bg-ink p-3" value={athlete?.id ?? ''} onChange={e => setParams({ athlete: e.target.value })}><option value="">Choose a player</option>{roster.map(a => <option value={a.id} key={a.id}>{a.name} · {a.position}</option>)}</select></label>
    </div>
    {athlete ? <><Link className="inline-block text-sm font-bold text-fai" to={`/athletes/${athlete.id}`}>Open {athlete.name}’s rating →</Link><PlayerStatsCard key={athlete.id} athlete={athlete} /></> : <p className="rounded-xl border border-dashed border-line p-6 text-muted">Select a player to enter the past three games. Dates and opponents stay editable, and saving a correction updates the existing game.</p>}
  </div>
}

import { useState } from 'react'
import { useStore } from '../store/useStore'
import { Card, Pill, SectionTitle } from './ui'
import { buildTeamRecord, outcomeOf, sortGamesRecentFirst } from '../lib/gameRecord'

const inputClass =
  'rounded-lg border border-line bg-panel px-3 py-2 text-sm font-semibold text-chalk outline-none placeholder:text-muted focus:border-fai'

function todayIso(): string {
  return new Date().toISOString().slice(0, 10)
}
function shortDate(iso: string): string {
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  return m ? `${Number(m[2])}/${Number(m[3])}` : iso
}

export default function GameScores() {
  const { data, canEdit, saveGameResult, removeGameResult } = useStore()
  const games = sortGamesRecentFirst(data.gameResults)
  const record = buildTeamRecord(data.gameResults)

  const [date, setDate] = useState(todayIso())
  const [opponent, setOpponent] = useState('')
  const [teamScore, setTeamScore] = useState('')
  const [oppScore, setOppScore] = useState('')

  function addGame() {
    if (!opponent.trim()) return
    saveGameResult({
      date: date || todayIso(),
      opponent: opponent.trim(),
      teamScore: Math.max(0, Number(teamScore) || 0),
      oppScore: Math.max(0, Number(oppScore) || 0),
    })
    setOpponent('')
    setTeamScore('')
    setOppScore('')
  }

  return (
    <Card className="p-5">
      <SectionTitle
        right={
          record.games > 0 ? (
            <span className="text-xs font-bold text-muted">
              PF {record.pointsFor} · PA {record.pointsAgainst}
            </span>
          ) : undefined
        }
      >
        Team Record{record.games > 0 ? ` · ${record.label}` : ''}
      </SectionTitle>

      {canEdit && (
        <div className="mt-3 grid gap-2 sm:grid-cols-[auto_1fr_auto_auto_auto]">
          <input type="date" value={date} onChange={(e) => setDate(e.target.value || todayIso())} className={inputClass} aria-label="Game date" />
          <input value={opponent} onChange={(e) => setOpponent(e.target.value)} placeholder="Opponent" className={inputClass} aria-label="Opponent" />
          <input type="number" min="0" value={teamScore} onChange={(e) => setTeamScore(e.target.value)} placeholder="Us" className={`${inputClass} w-20`} aria-label="Our score" />
          <input type="number" min="0" value={oppScore} onChange={(e) => setOppScore(e.target.value)} placeholder="Them" className={`${inputClass} w-20`} aria-label="Opponent score" />
          <button type="button" onClick={addGame} disabled={!opponent.trim()} className="rounded-lg bg-fai px-4 py-2 text-sm font-black text-ink disabled:opacity-40">+ Add</button>
        </div>
      )}

      {games.length === 0 ? (
        <div className="mt-4 rounded-xl border border-dashed border-line bg-panel-2/30 p-5 text-center text-sm text-muted">
          No game scores yet. Add each game&apos;s final score to build your record.
        </div>
      ) : (
        <div className="mt-4 divide-y divide-line overflow-hidden rounded-xl border border-line">
          {games.map((game) => {
            const outcome = outcomeOf(game)
            const tone = outcome === 'W' ? 'up' : outcome === 'L' ? 'down' : 'gold'
            return (
              <div key={game.id} className="flex items-center gap-3 bg-panel/40 px-3 py-2 text-sm">
                <Pill tone={tone}>{outcome}</Pill>
                <span className="min-w-0 flex-1 truncate font-bold text-chalk">{game.opponent}</span>
                <span className="nums text-muted">{shortDate(game.date)}</span>
                <span className="nums min-w-16 text-right font-black text-chalk">{game.teamScore}–{game.oppScore}</span>
                {canEdit && (
                  <button type="button" onClick={() => removeGameResult(game.id)} className="text-muted hover:text-down" aria-label={`Delete ${game.opponent} game`}>✕</button>
                )}
              </div>
            )
          })}
        </div>
      )}
    </Card>
  )
}

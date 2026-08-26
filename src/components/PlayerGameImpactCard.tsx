import type { PlayerGameImpact } from '../lib/playerGameImpact'

function shortDate(iso: string): string {
  const match = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  return match ? `${Number(match[2])}/${Number(match[3])}` : iso
}

/**
 * Per-game impact log for one athlete — what they produced in each game, most
 * recent first. The bar splits Playmaker (green) and Havoc (blue) production
 * against mistakes (red), scaled across the player's games.
 */
export default function PlayerGameImpactCard({ games }: { games: PlayerGameImpact[] }) {
  if (games.length === 0) return null
  const rows = [...games].reverse() // most recent first
  const scale = Math.max(
    1,
    ...rows.map((g) => Math.max(0, g.playmakerPoints) + Math.max(0, g.havocPoints) + g.negativePoints),
  )

  return (
    <div className="rounded-xl border border-line bg-panel p-4">
      <div className="flex items-baseline justify-between">
        <div className="text-[11px] font-black uppercase tracking-[0.18em] text-muted">Impact by Game</div>
        <div className="text-[10px] font-bold uppercase tracking-wide text-muted">⚡ play · 💥 havoc</div>
      </div>

      <div className="mt-3 space-y-2.5">
        {rows.map((game) => {
          const play = Math.max(0, game.playmakerPoints)
          const havoc = Math.max(0, game.havocPoints)
          const netTone = game.totalPoints > 0 ? 'text-up' : game.totalPoints < 0 ? 'text-down' : 'text-muted'
          return (
            <div key={game.date + game.gameLabel}>
              <div className="flex items-center gap-2 text-[11px]">
                <span className="min-w-24 truncate font-black text-chalk">{game.gameLabel}</span>
                <span className="nums text-muted">{shortDate(game.date)}</span>
                <span className="ml-auto flex items-center gap-2">
                  {game.playmakerPoints !== 0 && <span className="nums font-black text-up">⚡{game.playmakerPoints}</span>}
                  {game.havocPoints !== 0 && <span className="nums font-black text-fai">💥{game.havocPoints}</span>}
                  <span className="nums text-muted">🎯{game.efficiency}%</span>
                  <span className={`nums min-w-8 text-right font-black ${netTone}`}>
                    {game.totalPoints > 0 ? `+${game.totalPoints}` : game.totalPoints}
                  </span>
                </span>
              </div>
              <div className="mt-1 flex h-1.5 w-full overflow-hidden rounded-full bg-black/40">
                <span className="h-full bg-up" style={{ width: `${(play / scale) * 100}%` }} />
                <span className="h-full bg-fai" style={{ width: `${(havoc / scale) * 100}%` }} />
                <span className="h-full bg-down" style={{ width: `${(game.negativePoints / scale) * 100}%` }} />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

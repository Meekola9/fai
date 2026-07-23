import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { BadgeMedallion, badgeTierLabelClass, badgeTierName } from '../components/PlayerBadges'
import { GameDayBadgeArtwork } from '../components/GameDayBadges'
import { Card, Pill } from '../components/ui'
import {
  PLAYER_BADGE_CATALOG,
  type BadgeGroup,
  type BadgeTier,
} from '../lib/badges'
import {
  GAME_DAY_BADGE_CATALOG,
  NEGATIVE_GAME_DAY_BADGES,
  POSITIVE_GAME_DAY_BADGES,
} from '../lib/gameDayBadges'

const GROUP_ORDER: BadgeGroup[] = ['testing', 'performance', 'club', 'progress', 'ranking']
const GROUP_LABEL: Record<BadgeGroup, string> = {
  testing: 'Testing Foundation',
  performance: 'Athletic Profile',
  club: 'Performance Clubs',
  progress: 'Progress',
  ranking: 'Score & Ranking',
}

const TIER_ORDER: BadgeTier[] = ['bronze', 'silver', 'gold', 'elite', 'legend']

type GroupFilter = 'all' | BadgeGroup

export default function Badges() {
  const location = useLocation()
  const [group, setGroup] = useState<GroupFilter>('all')
  const [query, setQuery] = useState('')

  useEffect(() => {
    if (!location.hash) return
    const id = decodeURIComponent(location.hash.slice(1))
    window.requestAnimationFrame(() => {
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    })
  }, [location.hash])

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase()
    return PLAYER_BADGE_CATALOG.filter((badge) => {
      if (group !== 'all' && badge.group !== group) return false
      if (!term) return true
      return [
        badge.name,
        badge.description,
        badge.earnedBy,
        badge.group,
        badge.tier,
      ].some((value) => value.toLowerCase().includes(term))
    })
  }, [group, query])

  const grouped = useMemo(
    () => GROUP_ORDER.map((badgeGroup) => ({
      group: badgeGroup,
      items: filtered.filter((badge) => badge.group === badgeGroup),
    })).filter((section) => section.items.length > 0),
    [filtered],
  )

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="text-xs font-bold uppercase tracking-[0.2em] text-gold">FAI Achievement System</div>
          <h1 className="mt-1 text-3xl font-black tracking-tight text-chalk">Player Badges</h1>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted">
            FAI uses two separate badge systems. Testing badges are earned automatically from verified measurements and rankings. Game-day badges are awarded by a coach for a documented performance or mistake.
          </p>
        </div>
        <div className="flex gap-2">
          <Link to="/playmakers" className="rounded-lg border border-fai/30 bg-fai/5 px-3 py-2 text-xs font-bold text-fai hover:bg-fai/10">Award Game Badge</Link>
          <Link to="/stats" className="rounded-lg border border-line px-3 py-2 text-xs font-bold text-muted hover:text-fai">Stats Guide</Link>
          <Link to="/archetypes" className="rounded-lg border border-line px-3 py-2 text-xs font-bold text-muted hover:text-fai">Archetypes</Link>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <GuidePoint title="Testing badges" text="Automatically earned from recorded tests, category scores, event history, improvement, or official rank." />
        <GuidePoint title="Game-day badges" text="Manually awarded by a coach after a game. They do not add or subtract FAI, Havoc, or Playmaker points." />
        <GuidePoint title="One-week display" text="A game-day badge stays active on the athlete page for seven days from the game date." />
        <GuidePoint title="Season record" text="When the weekly display expires, the award remains in the athlete’s 2026 badge count." />
      </div>

      <section className="space-y-4" id="game-day-badges">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="text-xs font-bold uppercase tracking-[0.18em] text-fai">Coach-awarded</div>
            <h2 className="text-2xl font-black text-chalk">Game-Day Badges</h2>
            <p className="mt-1 max-w-3xl text-xs leading-relaxed text-muted">
              Award each badge from Playmakers &amp; Havoc using the game date and opponent. Multiple awards can be recorded in the same game, and every award counts toward the season total.
            </p>
          </div>
          <Pill tone="gold">{GAME_DAY_BADGE_CATALOG.length} badges</Pill>
        </div>

        <GameBadgeGroup title="Positive badges" tone="positive" badges={POSITIVE_GAME_DAY_BADGES} />
        <GameBadgeGroup title="Negative badges" tone="negative" badges={NEGATIVE_GAME_DAY_BADGES} />
      </section>

      <section className="space-y-4">
        <div>
          <div className="text-xs font-bold uppercase tracking-[0.18em] text-gold">Automatically earned</div>
          <h2 className="text-2xl font-black text-chalk">Testing &amp; FAI Badges</h2>
          <p className="mt-1 max-w-3xl text-xs leading-relaxed text-muted">
            These badges summarize verified testing. They are not manually assigned and do not certify football technique, toughness, production, IQ, leadership, or game readiness.
          </p>
        </div>

        <Card className="p-4">
          <div className="text-xs font-bold uppercase tracking-[0.16em] text-muted">Testing badge tiers</div>
          <div className="mt-3 flex flex-wrap gap-2">
            {TIER_ORDER.map((tier) => (
              <Pill key={tier} tone={tier === 'gold' ? 'gold' : tier === 'elite' ? 'fai' : 'default'}>
                <span className={badgeTierLabelClass(tier)}>{badgeTierName(tier)}</span>
              </Pill>
            ))}
          </div>
          <p className="mt-3 text-xs leading-relaxed text-muted">
            Tier indicates the difficulty and distinction of the testing achievement. It does not add points to FAI or override the athlete’s measured profile.
          </p>
        </Card>

        <div className="sticky top-[65px] z-30 space-y-3 border-y border-line bg-ink/95 py-3 backdrop-blur">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <label className="block flex-1 sm:max-w-md">
              <span className="sr-only">Search testing badges</span>
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search speed, improvement, rank, shuttle…"
                className="w-full rounded-xl border border-line bg-panel px-4 py-2.5 text-sm text-chalk outline-none placeholder:text-muted focus:border-fai"
              />
            </label>
            <div className="text-xs font-semibold text-muted">{filtered.length} of {PLAYER_BADGE_CATALOG.length} testing badges</div>
          </div>
          <div className="flex gap-1.5 overflow-x-auto pb-1">
            <FilterChip active={group === 'all'} onClick={() => setGroup('all')}>All</FilterChip>
            {GROUP_ORDER.map((item) => (
              <FilterChip key={item} active={group === item} onClick={() => setGroup(item)}>
                {GROUP_LABEL[item]}
              </FilterChip>
            ))}
          </div>
        </div>

        {grouped.length === 0 ? (
          <Card className="p-10 text-center text-muted">No testing badges match that search.</Card>
        ) : (
          grouped.map((section) => (
            <section key={section.group} className="space-y-3">
              <div className="flex items-end justify-between gap-3">
                <div>
                  <div className="text-xs font-bold uppercase tracking-[0.18em] text-gold">{section.group}</div>
                  <h3 className="text-xl font-black text-chalk">{GROUP_LABEL[section.group]}</h3>
                </div>
                <div className="text-xs text-muted">{section.items.length} badges</div>
              </div>
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {section.items.map((badge) => (
                  <div
                    key={badge.id}
                    id={badge.id}
                    className="scroll-mt-40 rounded-2xl target:ring-2 target:ring-gold/40"
                  >
                    <Card className="h-full p-4 transition target:border-gold/60">
                      <div className="flex items-start gap-4">
                        <BadgeMedallion badge={badge} size="lg" />
                        <div className="min-w-0 flex-1">
                          <div className={`text-[10px] font-bold uppercase tracking-[0.16em] ${badgeTierLabelClass(badge.tier)}`}>
                            {badgeTierName(badge.tier)} · {GROUP_LABEL[badge.group]}
                          </div>
                          <h4 className="mt-1 text-lg font-black text-chalk">{badge.name}</h4>
                        </div>
                      </div>
                      <p className="mt-4 text-sm leading-relaxed text-muted">{badge.description}</p>
                      <div className="mt-4 rounded-xl border border-line bg-panel-2/35 p-3">
                        <div className="text-[10px] font-bold uppercase tracking-[0.15em] text-gold">How to earn it</div>
                        <div className="mt-1 text-xs leading-relaxed text-chalk">{badge.earnedBy}</div>
                      </div>
                    </Card>
                  </div>
                ))}
              </div>
            </section>
          ))
        )}
      </section>
    </div>
  )
}

function GameBadgeGroup({
  title,
  tone,
  badges,
}: {
  title: string
  tone: 'positive' | 'negative'
  badges: typeof POSITIVE_GAME_DAY_BADGES
}) {
  return (
    <div>
      <div className={`mb-2 text-[11px] font-black uppercase tracking-[0.16em] ${tone === 'positive' ? 'text-fai' : 'text-down'}`}>{title}</div>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {badges.map((badge) => (
          <div key={badge.key} id={badge.id} className="scroll-mt-32">
            <Card className={`p-4 ${tone === 'positive' ? 'border-fai/20' : 'border-down/25'}`}>
              <div className="flex items-start gap-4">
                <GameDayBadgeArtwork badge={badge} size={70} />
                <div className="min-w-0 flex-1">
                  <div className={`text-[10px] font-bold uppercase tracking-[0.16em] ${tone === 'positive' ? 'text-fai' : 'text-down'}`}>
                    {tone} game-day badge
                  </div>
                  <h3 className="mt-1 text-lg font-black text-chalk">{badge.name}</h3>
                </div>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-muted">{badge.description}</p>
              <div className={`mt-3 rounded-xl border p-3 ${tone === 'positive' ? 'border-fai/20 bg-fai/5' : 'border-down/25 bg-down/5'}`}>
                <div className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted">Award when</div>
                <div className="mt-1 text-xs font-semibold leading-relaxed text-chalk">{badge.earnedBy}</div>
              </div>
            </Card>
          </div>
        ))}
      </div>
    </div>
  )
}

function GuidePoint({ title, text }: { title: string; text: string }) {
  return (
    <Card className="p-4">
      <div className="text-sm font-black text-chalk">{title}</div>
      <div className="mt-1 text-xs leading-relaxed text-muted">{text}</div>
    </Card>
  )
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-bold transition ${
        active ? 'bg-gold text-ink' : 'bg-panel-2 text-muted hover:text-chalk'
      }`}
    >
      {children}
    </button>
  )
}

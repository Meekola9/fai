import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { BadgeMedallion, badgeTierLabelClass, badgeTierName } from '../components/PlayerBadges'
import { Card, Pill } from '../components/ui'
import {
  PLAYER_BADGE_CATALOG,
  type BadgeGroup,
  type BadgeTier,
} from '../lib/badges'

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
            Badges turn verified testing results into recognizable achievements. They are earned automatically from the selected event, testing history, improvement, and official rankings—never assigned manually.
          </p>
        </div>
        <div className="flex gap-2">
          <Link to="/stats" className="rounded-lg border border-line px-3 py-2 text-xs font-bold text-muted hover:text-fai">Stats Guide</Link>
          <Link to="/archetypes" className="rounded-lg border border-line px-3 py-2 text-xs font-bold text-muted hover:text-fai">Archetypes</Link>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <GuidePoint title="Verified" text="A badge is tied to a recorded test, category score, event history, improvement result, or official rank." />
        <GuidePoint title="Event-specific" text="Changing the selected testing event can change the athlete’s earned badges and evidence." />
        <GuidePoint title="Position-aware" text="Big Man Burst is reserved for OL/DL, and Trench Strong excludes speed-skill groups to avoid overrewarding light body weight." />
        <GuidePoint title="Not film grades" text="Badges do not certify technique, toughness, production, football IQ, leadership, or game readiness." />
      </div>

      <Card className="p-4">
        <div className="text-xs font-bold uppercase tracking-[0.16em] text-muted">Badge tiers</div>
        <div className="mt-3 flex flex-wrap gap-2">
          {TIER_ORDER.map((tier) => (
            <Pill key={tier} tone={tier === 'gold' ? 'gold' : tier === 'elite' ? 'fai' : 'default'}>
              <span className={badgeTierLabelClass(tier)}>{badgeTierName(tier)}</span>
            </Pill>
          ))}
        </div>
        <p className="mt-3 text-xs leading-relaxed text-muted">
          Tier indicates the difficulty and distinction of the achievement. It does not add points to FAI or override the athlete’s actual testing profile.
        </p>
      </Card>

      <div className="sticky top-[65px] z-30 space-y-3 border-y border-line bg-ink/95 py-3 backdrop-blur">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <label className="block flex-1 sm:max-w-md">
            <span className="sr-only">Search player badges</span>
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search speed, improvement, rank, shuttle…"
              className="w-full rounded-xl border border-line bg-panel px-4 py-2.5 text-sm text-chalk outline-none placeholder:text-muted focus:border-fai"
            />
          </label>
          <div className="text-xs font-semibold text-muted">{filtered.length} of {PLAYER_BADGE_CATALOG.length} badges</div>
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
        <Card className="p-10 text-center text-muted">No badges match that search.</Card>
      ) : (
        grouped.map((section) => (
          <section key={section.group} className="space-y-3">
            <div className="flex items-end justify-between gap-3">
              <div>
                <div className="text-xs font-bold uppercase tracking-[0.18em] text-gold">{section.group}</div>
                <h2 className="text-xl font-black text-chalk">{GROUP_LABEL[section.group]}</h2>
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
                        <h3 className="mt-1 text-lg font-black text-chalk">{badge.name}</h3>
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

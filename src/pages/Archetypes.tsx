import { useEffect, useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { Card, Pill } from '../components/ui'
import { ARCHETYPE_MINDSET_GUIDE } from '../data/archetypeMindsets'
import { ARCHETYPE_CATALOG, type ArchetypeRole } from '../lib/archetypes'

const ROLE_ORDER: ArchetypeRole[] = [
  'QB',
  'RB',
  'WR',
  'TE',
  'OL',
  'DL',
  'EDGE',
  'LB',
  'CB',
  'S',
  'K/P',
]

const ROLE_LABEL: Record<ArchetypeRole, string> = {
  QB: 'Quarterback',
  RB: 'Running Back',
  WR: 'Wide Receiver',
  TE: 'Tight End',
  OL: 'Offensive Line',
  DL: 'Defensive Line',
  EDGE: 'Edge / Outside Linebacker',
  LB: 'Linebacker',
  CB: 'Cornerback',
  S: 'Safety',
  'K/P': 'Kicker / Punter',
}

type RoleFilter = 'ALL' | ArchetypeRole

function titleCase(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1)
}

function frameSignals(archetype: (typeof ARCHETYPE_CATALOG)[number]): string[] {
  const signals: string[] = []
  if (archetype.balanced) signals.push('Balanced across measured categories')
  if (archetype.developmental) signals.push('Developmental testing profile')
  if (archetype.size && archetype.size !== 'any') {
    signals.push(`${titleCase(archetype.size)} weight profile for the role`)
  }
  if (archetype.height && archetype.height !== 'any') {
    signals.push(`${titleCase(archetype.height)} height profile for the role`)
  }
  return signals
}

export default function Archetypes() {
  const location = useLocation()
  const [role, setRole] = useState<RoleFilter>('ALL')
  const [query, setQuery] = useState('')

  useEffect(() => {
    if (!location.hash) return
    const id = decodeURIComponent(location.hash.slice(1))
    window.requestAnimationFrame(() => {
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
  }, [location.hash])

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase()
    return ARCHETYPE_CATALOG.filter((archetype) => {
      if (role !== 'ALL' && archetype.role !== role) return false
      if (!term) return true
      const coaching = ARCHETYPE_MINDSET_GUIDE[archetype.id]
      return [
        archetype.name,
        archetype.description,
        coaching?.mindset ?? '',
        coaching?.onFieldUse ?? '',
        ROLE_LABEL[archetype.role],
        ...archetype.primary,
      ].some((value) => value.toLowerCase().includes(term))
    })
  }, [query, role])

  const grouped = useMemo(
    () => ROLE_ORDER.map((groupRole) => ({
      role: groupRole,
      items: filtered.filter((archetype) => archetype.role === groupRole),
    })).filter((group) => group.items.length > 0),
    [filtered],
  )

  const coachArchetypes = ARCHETYPE_CATALOG.filter((archetype) => archetype.role !== 'K/P').length
  const specialistArchetypes = ARCHETYPE_CATALOG.length - coachArchetypes

  return (
    <div className="space-y-6">
      <div>
        <div className="text-xs font-bold uppercase tracking-[0.2em] text-fai">FAI Player Guide</div>
        <h1 className="mt-1 text-3xl font-black tracking-tight text-chalk">Player Archetypes</h1>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted">
          Archetypes translate an athlete’s position-adjusted testing profile into a recognizable football label.
          Each entry now includes a developmental mindset and potential ways a coach could deploy that profile.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <GuidePoint title="Measured evidence" text="Speed, acceleration, jump, power, pursuit, change of direction, conditioning, and strength." />
        <GuidePoint title="Position-specific" text="The same test profile can produce a different label at quarterback, receiver, linebacker, or defensive back." />
        <GuidePoint title="Coaching projection" text="Mindset describes the habits a player could develop; potential usage describes schematic possibilities rather than a guaranteed role." />
        <GuidePoint title="Film still matters" text="Technique, football IQ, arm talent, coverage, ball skills, toughness, and decision-making must still be confirmed through film and practice." />
      </div>

      <Card className="border-fai/25 bg-fai/5 p-4">
        <div className="text-sm font-black text-chalk">How strength is handled for speed-skill players</div>
        <p className="mt-1 text-sm leading-relaxed text-muted">
          For RB, WR, DB, and ATH, Strength counts only 5% of overall FAI and receives reduced influence in archetype matching.
          This prevents very light athletes from being classified primarily by an inflated Bench/Body-Weight or Squat/Body-Weight ratio.
        </p>
      </Card>

      <Card className="border-gold/25 bg-gold/5 p-4">
        <div className="text-sm font-black text-chalk">How to read the mindset and usage sections</div>
        <p className="mt-1 text-sm leading-relaxed text-muted">
          The mindset is a coaching target—not a personality diagnosis. Potential on-field use lists roles and concepts that may fit the athlete’s measured profile.
          Final deployment should account for film, football skill, assignment reliability, health, maturity, and the team’s actual scheme.
        </p>
      </Card>

      <div className="sticky top-[65px] z-30 space-y-3 border-y border-line bg-ink/95 py-3 backdrop-blur">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <label className="relative block flex-1 sm:max-w-md">
            <span className="sr-only">Search archetypes</span>
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search name, trait, mindset, or usage…"
              className="w-full rounded-xl border border-line bg-panel px-4 py-2.5 text-sm text-chalk outline-none placeholder:text-muted focus:border-fai"
            />
          </label>
          <div className="text-xs font-semibold text-muted">
            {coachArchetypes} coach-defined · {specialistArchetypes} specialist fallbacks
          </div>
        </div>

        <div className="flex gap-1.5 overflow-x-auto pb-1">
          <RoleChip active={role === 'ALL'} onClick={() => setRole('ALL')}>All</RoleChip>
          {ROLE_ORDER.map((item) => (
            <RoleChip key={item} active={role === item} onClick={() => setRole(item)}>
              {item}
            </RoleChip>
          ))}
        </div>
      </div>

      {grouped.length === 0 ? (
        <Card className="p-10 text-center text-muted">No archetypes match that search.</Card>
      ) : (
        grouped.map((group) => (
          <section key={group.role} className="space-y-3">
            <div className="flex items-end justify-between gap-3">
              <div>
                <div className="text-xs font-bold uppercase tracking-[0.18em] text-fai">{group.role}</div>
                <h2 className="text-xl font-black text-chalk">{ROLE_LABEL[group.role]}</h2>
              </div>
              <div className="text-xs text-muted">{group.items.length} archetype{group.items.length === 1 ? '' : 's'}</div>
            </div>

            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {group.items.map((archetype) => {
                const frame = frameSignals(archetype)
                const coaching = ARCHETYPE_MINDSET_GUIDE[archetype.id]
                return (
                  <div
                    key={archetype.id}
                    id={archetype.id}
                    className="scroll-mt-40 rounded-2xl target:ring-2 target:ring-fai/30"
                  >
                    <Card className="h-full p-4 transition target:border-fai">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted">
                            {ROLE_LABEL[archetype.role]}
                          </div>
                          <h3 className="mt-1 text-lg font-black text-fai">{archetype.name}</h3>
                        </div>
                        {archetype.developmental && <Pill tone="gold">Developmental</Pill>}
                      </div>

                      <p className="mt-3 text-sm leading-relaxed text-muted">{archetype.description}</p>

                      {coaching && (
                        <div className="mt-4 space-y-3">
                          <div className="rounded-xl border border-fai/20 bg-fai/5 p-3">
                            <div className="text-[10px] font-bold uppercase tracking-[0.15em] text-fai">
                              Mindset to develop
                            </div>
                            <p className="mt-1.5 text-sm leading-relaxed text-chalk/90">{coaching.mindset}</p>
                          </div>
                          <div className="rounded-xl border border-gold/20 bg-gold/5 p-3">
                            <div className="text-[10px] font-bold uppercase tracking-[0.15em] text-gold">
                              Potential on-field use
                            </div>
                            <p className="mt-1.5 text-sm leading-relaxed text-chalk/90">{coaching.onFieldUse}</p>
                          </div>
                        </div>
                      )}

                      <div className="mt-4">
                        <div className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted">
                          Primary measured signals
                        </div>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {archetype.primary.map((trait) => (
                            <Pill key={trait} tone="fai">{trait}</Pill>
                          ))}
                        </div>
                      </div>

                      {frame.length > 0 && (
                        <div className="mt-4 border-t border-line pt-3">
                          <div className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted">
                            Additional matching signals
                          </div>
                          <div className="mt-1.5 space-y-1 text-xs text-muted">
                            {frame.map((signal) => <div key={signal}>• {signal}</div>)}
                          </div>
                        </div>
                      )}
                    </Card>
                  </div>
                )
              })}
            </div>
          </section>
        ))
      )}

      <Card className="p-5">
        <h2 className="text-lg font-black text-chalk">Confidence labels</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <Confidence label="High" text="A complete battery, or enough measured categories to strongly support the match." />
          <Confidence label="Medium" text="Several useful measurements are available, but part of the athletic profile is still missing." />
          <Confidence label="Low" text="The label is preliminary because only one or two meaningful categories are available." />
        </div>
      </Card>
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

function RoleChip({
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
        active ? 'bg-fai text-ink' : 'bg-panel-2 text-muted hover:text-chalk'
      }`}
    >
      {children}
    </button>
  )
}

function Confidence({ label, text }: { label: string; text: string }) {
  return (
    <div className="rounded-xl border border-line bg-panel-2/40 p-3">
      <div className="text-sm font-black text-fai">{label}</div>
      <div className="mt-1 text-xs leading-relaxed text-muted">{text}</div>
    </div>
  )
}

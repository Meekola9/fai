import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Card, Pill } from '../components/ui'
import {
  CATEGORY_WEIGHTS,
  SPEED_SKILL_CATEGORY_WEIGHTS,
} from '../data/scoring'
import {
  STAT_GUIDE,
  STAT_GUIDE_SECTIONS,
  type StatDirection,
  type StatGuideSection,
} from '../data/statGuide'
import { CATEGORIES } from '../data/constants'

const SECTION_ORDER: StatGuideSection[] = ['profile', 'test', 'category', 'indicator']
type SectionFilter = 'all' | StatGuideSection

const DIRECTION_LABEL: Record<StatDirection, string> = {
  lower: 'Lower is better',
  higher: 'Higher is better',
  context: 'Context field',
  derived: 'Derived score',
}

function sectionCount(section: StatGuideSection): number {
  return STAT_GUIDE.filter((entry) => entry.section === section).length
}

export default function StatsGuide() {
  const [section, setSection] = useState<SectionFilter>('all')
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase()
    return STAT_GUIDE.filter((entry) => {
      if (section !== 'all' && entry.section !== section) return false
      if (!term) return true
      return [
        entry.name,
        entry.meaning,
        entry.footballMeaning,
        entry.interpretation,
        entry.caution,
        entry.scoringNote ?? '',
        entry.category ?? '',
        entry.unit ?? '',
        ...(entry.searchTerms ?? []),
      ].some((value) => value.toLowerCase().includes(term))
    })
  }, [query, section])

  const grouped = useMemo(
    () => SECTION_ORDER.map((groupSection) => ({
      section: groupSection,
      items: filtered.filter((entry) => entry.section === groupSection),
    })).filter((group) => group.items.length > 0),
    [filtered],
  )

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="text-xs font-bold uppercase tracking-[0.2em] text-fai">FAI Coaching Reference</div>
          <h1 className="mt-1 text-3xl font-black tracking-tight text-chalk">Tracked Stats & Meanings</h1>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted">
            Every field below explains what FAI records, what the number may mean on the football field,
            how to read it, and where the measurement can be misleading.
          </p>
        </div>
        <Link
          to="/archetypes"
          className="inline-flex w-fit items-center rounded-xl border border-fai/30 bg-fai/5 px-4 py-2 text-sm font-bold text-fai hover:bg-fai/10"
        >
          View archetype guide →
        </Link>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <RuleCard
          title="Timed tests"
          text="Lower times are better. FAI normally keeps the best valid attempt, but the timing setup must stay consistent."
        />
        <RuleCard
          title="Distance, reps, and load"
          text="Higher results are better, provided every athlete follows the same technique, range-of-motion, and counting standard."
        />
        <RuleCard
          title="0–100 scores"
          text="FAI scores are benchmark scales, not percentiles. A 75 is not the same as being better than 75% of athletes."
        />
        <RuleCard
          title="Athletic evidence"
          text="Testing supports development and role decisions, but film, health, football skill, maturity, and assignment reliability still decide usage."
        />
      </div>

      <Card className="p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-black text-chalk">Current FAI category weights</h2>
            <p className="mt-1 text-xs leading-relaxed text-muted">
              Speed-skill groups are RB, WR, DB, and ATH. Strength is reduced for those groups so light athletes are not over-rewarded by body-weight ratios.
            </p>
          </div>
          <Pill tone="fai">Total = 100%</Pill>
        </div>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[620px] text-sm">
            <thead>
              <tr className="border-b border-line text-left text-[10px] uppercase tracking-[0.15em] text-muted">
                <th className="py-2 pr-4">Category</th>
                <th className="px-3 text-right">RB / WR / DB / ATH</th>
                <th className="px-3 text-right">QB / TE / OL / DL / LB / K-P</th>
                <th className="pl-4">Primary source</th>
              </tr>
            </thead>
            <tbody>
              {CATEGORIES.map((category) => (
                <tr key={category} className="border-b border-line/50">
                  <td className="py-2 pr-4 font-bold text-chalk">{category}</td>
                  <td className="px-3 text-right font-black nums text-fai">
                    {(SPEED_SKILL_CATEGORY_WEIGHTS[category] * 100).toFixed(0)}%
                  </td>
                  <td className="px-3 text-right font-black nums text-chalk">
                    {(CATEGORY_WEIGHTS[category] * 100).toFixed(0)}%
                  </td>
                  <td className="pl-4 text-xs text-muted">{categorySource(category)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="sticky top-[65px] z-30 space-y-3 border-y border-line bg-ink/95 py-3 backdrop-blur">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <label className="block flex-1 sm:max-w-lg">
            <span className="sr-only">Search tracked stats</span>
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search 40, top speed, strength, rank, conditioning…"
              className="w-full rounded-xl border border-line bg-panel px-4 py-2.5 text-sm text-chalk outline-none placeholder:text-muted focus:border-fai"
            />
          </label>
          <div className="text-xs font-semibold text-muted">{filtered.length} explanations shown</div>
        </div>

        <div className="flex gap-1.5 overflow-x-auto pb-1">
          <FilterChip active={section === 'all'} onClick={() => setSection('all')}>
            All · {STAT_GUIDE.length}
          </FilterChip>
          {SECTION_ORDER.map((item) => (
            <FilterChip key={item} active={section === item} onClick={() => setSection(item)}>
              {STAT_GUIDE_SECTIONS[item]} · {sectionCount(item)}
            </FilterChip>
          ))}
        </div>
      </div>

      {grouped.length === 0 ? (
        <Card className="p-10 text-center text-muted">No tracked stats match that search.</Card>
      ) : (
        grouped.map((group) => (
          <section key={group.section} className="space-y-3">
            <div className="flex items-end justify-between gap-3">
              <div>
                <div className="text-xs font-bold uppercase tracking-[0.18em] text-fai">FAI Reference</div>
                <h2 className="text-xl font-black text-chalk">{STAT_GUIDE_SECTIONS[group.section]}</h2>
              </div>
              <div className="text-xs text-muted">{group.items.length} item{group.items.length === 1 ? '' : 's'}</div>
            </div>

            <div className="grid gap-3 lg:grid-cols-2">
              {group.items.map((entry) => (
                <div key={entry.id} id={entry.id} className="scroll-mt-40 rounded-2xl target:ring-2 target:ring-fai/30">
                  <Card className="h-full p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted">
                          {STAT_GUIDE_SECTIONS[entry.section]}
                        </div>
                        <h3 className="mt-1 text-lg font-black text-fai">{entry.name}</h3>
                      </div>
                      <div className="flex flex-wrap justify-end gap-1.5">
                        <Pill>{DIRECTION_LABEL[entry.direction]}</Pill>
                        {entry.unit && <Pill tone="gold">{entry.unit}</Pill>}
                        {entry.required !== undefined && (
                          <Pill tone={entry.required ? 'fai' : 'default'}>
                            {entry.required ? 'Required' : 'Optional / limited'}
                          </Pill>
                        )}
                      </div>
                    </div>

                    {entry.category && (
                      <div className="mt-2 text-xs font-bold text-muted">
                        FAI category: <span className="text-chalk">{entry.category}</span>
                      </div>
                    )}

                    <div className="mt-4 grid gap-3">
                      <Explanation label="What it measures" text={entry.meaning} />
                      <Explanation label="Football meaning" text={entry.footballMeaning} />
                      <Explanation label="How to read it" text={entry.interpretation} />
                      <Explanation label="Do not overread it" text={entry.caution} tone="warning" />
                      {entry.scoringNote && (
                        <Explanation label="FAI scoring note" text={entry.scoringNote} tone="fai" />
                      )}
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

function RuleCard({ title, text }: { title: string; text: string }) {
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
        active ? 'bg-fai text-ink' : 'bg-panel-2 text-muted hover:text-chalk'
      }`}
    >
      {children}
    </button>
  )
}

function Explanation({
  label,
  text,
  tone = 'default',
}: {
  label: string
  text: string
  tone?: 'default' | 'warning' | 'fai'
}) {
  const className = tone === 'warning'
    ? 'border-flame/20 bg-flame/5'
    : tone === 'fai'
      ? 'border-fai/20 bg-fai/5'
      : 'border-line bg-panel-2/30'
  return (
    <div className={`rounded-xl border p-3 ${className}`}>
      <div className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted">{label}</div>
      <div className="mt-1 text-sm leading-relaxed text-chalk/90">{text}</div>
    </div>
  )
}

function categorySource(category: (typeof CATEGORIES)[number]): string {
  switch (category) {
    case 'Speed': return '10-yard fly'
    case 'Acceleration': return '40-yard dash; 10-yard dash for OL/DL'
    case 'Jump': return 'Vertical jump'
    case 'Power': return 'Broad jump + hang-clean reps at body weight'
    case 'Pursuit': return 'Illinois agility test'
    case 'Change of Direction': return '20-yard shuttle + lateral 10-yard shuttle'
    case 'Conditioning': return '5-10-15 shuttle yards in 30 seconds'
    case 'Strength': return 'Bench/BW + Squat/BW'
  }
}

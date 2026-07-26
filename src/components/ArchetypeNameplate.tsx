import { CATEGORY_SHORT } from '../data/constants'
import type { Category } from '../types'
import type { PlayerArchetype } from '../lib/archetypes'

const CONFIDENCE_LABEL: Record<PlayerArchetype['confidence'], string> = {
  high: 'High match',
  medium: 'Likely match',
  low: 'Early read',
}

interface NameplateStat {
  label: string
  value: string
}

/**
 * The archetype's lead traits already come pre-sorted as evidence strings
 * ("Speed 91", "Change of Direction 82"). Split each into a short label and the
 * overall it earned, so the nameplate shows only those numbers.
 */
function parseEvidence(evidence: readonly string[]): NameplateStat[] {
  return evidence.map((entry) => {
    const cut = entry.lastIndexOf(' ')
    if (cut < 0) return { label: entry, value: '' }
    const category = entry.slice(0, cut)
    return {
      label: CATEGORY_SHORT[category as Category] ?? category,
      value: entry.slice(cut + 1),
    }
  })
}

/**
 * The player's archetype rendered as a shining name title — the name itself,
 * with the overalls of the stats that earned it directly underneath and nothing
 * else. Used on the athlete profile beneath the player card.
 */
export function ArchetypeNameplate({
  archetype,
  positionLabel,
}: {
  archetype: PlayerArchetype
  positionLabel?: string
}) {
  const stats = parseEvidence(archetype.evidence)

  return (
    <section
      aria-label={`${archetype.name} archetype`}
      className="relative overflow-hidden rounded-2xl border border-line px-6 py-8 text-center"
      style={{
        background:
          'radial-gradient(120% 120% at 30% -10%, rgba(198,242,78,0.10), transparent 60%), linear-gradient(160deg, #0c1015, #060809)',
      }}
    >
      <div className="text-[0.7rem] font-extrabold uppercase tracking-[0.3em] text-muted">
        {positionLabel ?? archetype.positionGroup} · {CONFIDENCE_LABEL[archetype.confidence]}
      </div>
      <h2 className="archetype-title mx-auto mt-2 max-w-[16ch] text-[clamp(1.9rem,6.5vw,3.6rem)] font-black uppercase italic leading-[0.95] tracking-[-0.02em]">
        {archetype.name}
      </h2>
      {stats.length > 0 && (
        <div className="mt-5 flex flex-wrap justify-center gap-x-9 gap-y-3">
          {stats.map((stat) => (
            <div key={stat.label} className="flex flex-col items-center">
              <span className="archetype-stat-val nums text-[clamp(1.6rem,5vw,2.5rem)] font-black leading-none text-chalk">
                {stat.value}
              </span>
              <span className="mt-1 text-[0.68rem] font-extrabold uppercase tracking-[0.18em] text-muted">
                {stat.label}
              </span>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}

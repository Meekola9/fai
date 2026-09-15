import { verticalFaiScore } from '../lib/verticalBenchmarks'
import { illinoisAgilityScore } from '../lib/illinoisAgility'
import { archetypeRules, archetypeMatches } from '../lib/archetypes'
import { METRICS_BY_CATEGORY, benchmarkFor, benchmarkScore } from '../data/scoring'
import type { ComputedSession } from '../types'

export default function ArchetypeRequirements({ id, result }: { id: string; result?: ComputedSession }) {
  const rules = archetypeRules(id)
  if (!rules) return null
  const { definition, build } = rules
  const group = result?.session.positionGroupSnapshot ?? definition.group
  const metrics = definition.primary.flatMap(category => METRICS_BY_CATEGORY(category))
    .filter(metric => metric.key !== 'powerCleanMax' && (!metric.gradedGroups || metric.gradedGroups.includes(group)))
  function target(key: string, higher: boolean, score: number) {
    const benchmark = benchmarkFor(key, group)
    const scoreFor = (raw: number) => key === 'verticalJump' ? verticalFaiScore(raw, group) : key === 'illinois' ? illinoisAgilityScore(raw)! : benchmarkScore(raw, benchmark, higher)
    let low = key === 'verticalJump' ? 0 : key === 'illinois' ? 10 : Math.min(benchmark.elite, benchmark.developmental)
    let high = key === 'verticalJump' ? 60 : key === 'illinois' ? 30 : Math.max(benchmark.elite, benchmark.developmental)
    for (let i = 0; i < 40; i++) {
      const mid = (low + high) / 2
      if ((scoreFor(mid) < score) === higher) low = mid
      else high = mid
    }
    return ((low + high) / 2).toFixed(2)
  }
  const matches = result ? archetypeMatches(result).slice(0, 3) : []
  return <details className="mt-4 rounded-xl border border-line bg-panel p-4 text-left text-sm">
    <summary className="cursor-pointer font-black text-fai">Numbers behind this comparison</summary>
    <p className="mt-3 text-muted">FAI assigns the highest relative fit within the player’s position. There is no single 40 time or minimum overall that guarantees this archetype. Scores below are FAI testing benchmarks, not college or NFL recruiting standards.</p>
    <p className="mt-2 text-chalk">Lead traits: {definition.primary.join(' → ')}.</p>
    <p className="mt-2 text-muted">{build.join(' · ')}. Matching a weight preference adds 4 fit points; missing it subtracts 2. Matching a height preference adds 3; missing it subtracts 1.5. These are preferences, not eligibility gates.</p>
    {definition.balanced && <p className="mt-2 text-muted">Balance bonus = max(0, 14 − category spread × 0.65), using position-adjusted scores. A smaller spread strengthens this match.</p>}
    {definition.developmental && <p className="mt-2 text-muted">Developmental fit = 100 − average available category score, plus build preferences.</p>}
    <p className="mt-2 text-muted">Aim for 60+ in the lead traits; 80+ is a stronger training target. These are coaching targets, not classification cutoffs. The pattern across all traits decides the match; receiver roles also consider how speed, change of direction, jump, and build separate.</p>
    <div className="mt-3 overflow-x-auto"><table className="w-full text-left text-xs"><caption className="pb-2 text-left text-muted">Raw marks for {group} · lower times / higher jumps and ratios are better</caption><thead><tr><th className="p-2">Test</th>{result && <th className="p-2">Player</th>}<th className="p-2">60 score</th><th className="p-2">80 score</th></tr></thead><tbody>{metrics.map(metric => <tr key={metric.key} className="border-t border-line"><td className="p-2">{metric.label} ({metric.unit})</td>{result && <td className="p-2">{result.metrics[metric.key]?.toFixed(2) ?? 'Not tested'}</td>}<td className="p-2">{target(metric.key, metric.higherBetter, 60)}</td><td className="p-2">{target(metric.key, metric.higherBetter, 80)}</td></tr>)}</tbody></table></div>
    <p className="mt-2 text-xs text-muted">Power-clean targets: about 0.713 × body weight for a 60 score, and 1.00 × body weight for an 80 score. Technique, decision-making, and ball skills require coach evaluation.</p>
    {matches.length > 0 && <div className="mt-3"><p className="font-bold">This player’s closest matches</p>{matches.map(match => <p key={match.id} className="mt-1 text-muted">{match.name}: {match.score.toFixed(1)} fit points</p>)}<p className="mt-1 text-xs text-muted">Fit points rank competing profiles; they are not a percentage or the player’s overall.</p></div>}
  </details>
}

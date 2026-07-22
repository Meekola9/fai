import { overallRatingFor } from '../lib/overallRatings'

const TONE_CLASS = {
  legend: 'border-violet-300/50 bg-violet-400/15 text-violet-100',
  dawg: 'border-gold/50 bg-gold/15 text-gold',
  difference: 'border-fai/45 bg-fai/10 text-fai',
  developing: 'border-up/40 bg-up/10 text-up',
  building: 'border-slate-400/35 bg-slate-400/10 text-slate-200',
  'needs-work': 'border-down/45 bg-down/10 text-down',
} as const

export function OverallRatingName({
  score,
  compact = false,
  showRange = false,
}: {
  score: number
  compact?: boolean
  showRange?: boolean
}) {
  const band = overallRatingFor(score)
  return (
    <span
      className={`inline-flex items-center rounded-full border font-black uppercase tracking-wider ${TONE_CLASS[band.tone]} ${compact ? 'px-2 py-0.5 text-[9px]' : 'px-3 py-1 text-[10px]'}`}
      title={`${band.rangeLabel}: ${band.description}`}
    >
      {band.label}{showRange ? ` · ${band.rangeLabel}` : ''}
    </span>
  )
}

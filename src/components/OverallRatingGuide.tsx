import { OVERALL_RATING_BANDS } from '../lib/overallRatings'
import { OverallRatingName } from './OverallRatingName'
import { Card } from './ui'

export function OverallRatingGuide() {
  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-black text-chalk">Overall FAI names</h2>
          <p className="mt-1 max-w-3xl text-xs leading-relaxed text-muted">
            The name summarizes the overall 0–100 score. It does not replace the category breakdown, film evaluation, or position-specific context.
          </p>
        </div>
        <span className="rounded-full border border-fai/25 bg-fai/5 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-fai">Official scale</span>
      </div>
      <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {OVERALL_RATING_BANDS.map((band) => (
          <div key={band.id} className="rounded-xl border border-line bg-panel-2/35 p-3">
            <div className="flex items-center justify-between gap-2">
              <OverallRatingName score={band.min} compact />
              <span className="text-xs font-black nums text-chalk">{band.rangeLabel}</span>
            </div>
            <div className="mt-2 text-xs leading-relaxed text-muted">{band.description}</div>
          </div>
        ))}
      </div>
    </Card>
  )
}

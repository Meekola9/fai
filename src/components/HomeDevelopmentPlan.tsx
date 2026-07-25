import { Card, Pill, SectionTitle } from './ui'
import { homeTrainingPlansFor } from '../lib/homeTraining'
import type { Category } from '../types'

export interface HomeDevelopmentPlanProps {
  categories: readonly Category[]
  scores?: Partial<Record<Category, number>>
  title?: string
  maxCategories?: number
}

export function HomeDevelopmentPlan({
  categories,
  scores,
  title = 'At-Home Development Plan',
  maxCategories = 2,
}: HomeDevelopmentPlanProps) {
  const plans = homeTrainingPlansFor(categories, maxCategories)

  return (
    <Card className="overflow-hidden border-fai/25 p-0" data-testid="home-development-plan">
      <div className="border-b border-line bg-gradient-to-r from-fai/10 via-panel to-panel p-5">
        <SectionTitle
          right={<Pill tone="fai">No gym required</Pill>}
        >
          {title}
        </SectionTitle>
        <p className="text-xs leading-relaxed text-muted">
          Supplemental work based on the athlete&apos;s lowest FAI categories. Use clean technique, leave fatigue in reserve, and stop any drill that causes pain.
        </p>
      </div>

      {plans.length ? (
        <div className="grid gap-0 lg:grid-cols-2">
          {plans.map((plan, planIndex) => (
            <section
              key={plan.category}
              className={`p-5 ${planIndex > 0 ? 'border-t border-line lg:border-l lg:border-t-0' : ''}`}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="text-[10px] font-black uppercase tracking-[0.2em] text-fai">Priority category</div>
                  <h3 className="mt-1 text-xl font-black text-chalk">{plan.category}</h3>
                </div>
                {typeof scores?.[plan.category] === 'number' && (
                  <div className="rounded-xl border border-down/30 bg-down/5 px-3 py-2 text-center">
                    <div className="text-[9px] font-black uppercase tracking-wider text-muted">Current</div>
                    <div className="nums text-xl font-black text-down">{scores[plan.category]!.toFixed(0)}</div>
                  </div>
                )}
              </div>

              <p className="mt-2 text-sm leading-relaxed text-muted">{plan.objective}</p>
              <div className="mt-2 text-[10px] font-bold uppercase tracking-wider text-gold">{plan.frequency}</div>

              <div className="mt-4 space-y-3">
                {plan.exercises.map((exercise, index) => (
                  <div key={exercise.name} className="rounded-xl border border-line bg-panel-2/35 p-3">
                    <div className="flex items-start gap-3">
                      <div className="grid h-7 w-7 shrink-0 place-items-center rounded-full border border-fai/35 bg-fai/10 text-xs font-black text-fai">{index + 1}</div>
                      <div className="min-w-0">
                        <div className="font-black text-chalk">{exercise.name}</div>
                        <div className="nums mt-0.5 text-xs font-bold text-fai">{exercise.prescription}</div>
                        <div className="mt-1 text-xs leading-relaxed text-muted">{exercise.cue}</div>
                        {exercise.equipment && <div className="mt-1 text-[10px] font-bold uppercase tracking-wider text-white/45">Equipment: {exercise.equipment}</div>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      ) : (
        <div className="p-6 text-sm text-muted">No major weakness is currently flagged. Maintain the full team program.</div>
      )}

      <div className="border-t border-line bg-panel-2/25 px-5 py-3 text-[11px] leading-relaxed text-muted">
        These are general supplemental recommendations, not injury rehabilitation. Athletes should follow their coach&apos;s weekly plan and avoid adding high-impact work before games or max-speed sessions.
      </div>
    </Card>
  )
}

import { PLAYER_USAGE_DEFINITIONS, playerUsagePlanLine } from '../lib/playerUsage'
import type { Athlete, PlayerUsage } from '../types'

const ORDER: PlayerUsage[] = ['one-way', 'iron-man', 'two-way']

function UsageCardContent({ usage, compact }: { usage: PlayerUsage; compact: boolean }) {
  const definition = PLAYER_USAGE_DEFINITIONS[usage]
  return (
    <>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="deployment-card-title">{definition.label}</div>
          <div className="deployment-card-split">{playerUsagePlanLine(usage)}</div>
        </div>
        <div className="deployment-card-index" aria-hidden="true">
          {usage === 'one-way' ? '01' : usage === 'iron-man' ? '02' : '03'}
        </div>
      </div>
      <p className="deployment-card-copy">{definition.description}</p>
      {!compact && (
        <div className="deployment-card-detail">
          <strong>Install:</strong> {definition.installScope}
        </div>
      )}
    </>
  )
}

export function PlayerUsageGuide({
  value,
  onChange,
  compact = false,
}: {
  value?: PlayerUsage
  onChange?: (usage: PlayerUsage) => void
  compact?: boolean
}) {
  return (
    <div className={`grid gap-3 ${compact ? 'md:grid-cols-3' : 'lg:grid-cols-3'}`} aria-label="Player deployment roles">
      {ORDER.map((usage) => {
        const selected = value === usage
        const className = `deployment-card text-left ${selected ? 'deployment-card-selected' : ''}`
        return onChange ? (
          <button
            key={usage}
            type="button"
            onClick={() => onChange(usage)}
            className={className}
            aria-pressed={selected}
          >
            <UsageCardContent usage={usage} compact={compact} />
          </button>
        ) : (
          <div key={usage} className={className}>
            <UsageCardContent usage={usage} compact={compact} />
          </div>
        )
      })}
    </div>
  )
}

export function PlayerUsageSummary({ usage, athlete }: { usage?: PlayerUsage; athlete?: Athlete }) {
  const resolvedUsage = athlete?.usage ?? usage ?? 'one-way'
  const definition = PLAYER_USAGE_DEFINITIONS[resolvedUsage]
  const restrictedPackage = resolvedUsage === 'iron-man' ? athlete?.ironManPackage : undefined
  return (
    <div className="deployment-summary">
      <div className="deployment-summary-kicker">Deployment plan</div>
      <div className="deployment-summary-title">{definition.label}</div>
      <div className="deployment-summary-split">{playerUsagePlanLine(resolvedUsage)}</div>
      <p>{definition.gamePlan}</p>
      {resolvedUsage === 'iron-man' && (
        <div className="mt-4 border-t border-line pt-4">
          <div className="flex flex-wrap items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted">
            <span>Restricted package</span>
            <span className="rounded-full border border-fai/30 px-2 py-1 text-fai">{restrictedPackage?.status ?? 'planning'}</span>
            <span>{restrictedPackage?.secondarySnapCapPct ?? 30}% snap ceiling</span>
          </div>
          {restrictedPackage ? (
            <div className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
              <div><strong className="text-chalk">Formations:</strong> <span className="text-muted">{restrictedPackage.formations.join(', ') || 'Not assigned'}</span></div>
              <div><strong className="text-chalk">Calls:</strong> <span className="text-muted">{restrictedPackage.calls.length}/10 installed</span></div>
              {restrictedPackage.responsibilities && <div className="sm:col-span-2"><strong className="text-chalk">Responsibilities:</strong> <span className="text-muted">{restrictedPackage.responsibilities}</span></div>}
              {restrictedPackage.reviewDate && <div className="sm:col-span-2 text-xs text-muted">Review {new Date(`${restrictedPackage.reviewDate}T12:00:00`).toLocaleDateString()}</div>}
            </div>
          ) : (
            <div className="mt-2 text-sm text-gold">No restricted package has been installed yet.</div>
          )}
        </div>
      )}
    </div>
  )
}

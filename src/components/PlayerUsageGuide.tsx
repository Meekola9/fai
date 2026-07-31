import { PLAYER_USAGE_DEFINITIONS, playerUsagePlanLine } from '../lib/playerUsage'
import type { PlayerUsage } from '../types'

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

export function PlayerUsageSummary({ usage }: { usage?: PlayerUsage }) {
  const definition = PLAYER_USAGE_DEFINITIONS[usage ?? 'one-way']
  return (
    <div className="deployment-summary">
      <div className="deployment-summary-kicker">Deployment plan</div>
      <div className="deployment-summary-title">{definition.label}</div>
      <div className="deployment-summary-split">{playerUsagePlanLine(usage)}</div>
      <p>{definition.gamePlan}</p>
    </div>
  )
}

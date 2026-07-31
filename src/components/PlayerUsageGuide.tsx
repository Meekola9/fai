import { PLAYER_USAGE_DEFINITIONS, playerUsagePlanLine } from '../lib/playerUsage'
import type { PlayerUsage } from '../types'

const ORDER: PlayerUsage[] = ['one-way', 'iron-man', 'two-way']

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
        const definition = PLAYER_USAGE_DEFINITIONS[usage]
        const selected = value === usage
        const Element = onChange ? 'button' : 'div'
        return (
          <Element
            key={usage}
            {...(onChange ? { type: 'button' as const, onClick: () => onChange(usage) } : {})}
            className={`deployment-card text-left ${selected ? 'deployment-card-selected' : ''}`}
            aria-pressed={onChange ? selected : undefined}
          >
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
          </Element>
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

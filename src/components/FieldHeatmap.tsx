import type { FieldHeatmap as HeatmapData } from '../lib/playerHeatmap'

const FIELD_LENGTH = 100 // yards
const FIELD_WIDTH = 53.3 // yards

interface Props {
  heatmap: HeatmapData
  scopeLabel: string
}

// Warm ramp over the green field: cool-low (amber) → hot-high (red).
function heatColor(weight: number): string {
  const r = 253 + (239 - 253) * weight // 253 → 239
  const g = 224 + (68 - 224) * weight // 224 → 68
  const b = 71 + (68 - 71) * weight // 71 → 68
  const alpha = 0.15 + 0.72 * weight
  return `rgba(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)}, ${alpha.toFixed(3)})`
}

/**
 * Player occupancy heatmap over a top-down field — where a player (or the whole
 * tracked group) spent their time, in real yards from the CV field map.
 */
export default function FieldHeatmap({ heatmap, scopeLabel }: Props) {
  const { cols, rows, cells } = heatmap
  const cellW = FIELD_LENGTH / cols
  const cellH = FIELD_WIDTH / rows

  return (
    <div className="overflow-hidden rounded-xl border border-line bg-[#12331f]" data-testid="field-heatmap">
      <div className="flex items-center justify-between border-b border-white/15 bg-black/20 px-3 py-2">
        <div className="text-xs font-black uppercase tracking-wider text-white">Heatmap · {scopeLabel}</div>
        <div className="text-[11px] font-bold text-white/70">{heatmap.peakSeconds}s peak</div>
      </div>
      <div className="relative w-full" style={{ aspectRatio: `${FIELD_LENGTH} / ${FIELD_WIDTH}` }}>
        <svg className="absolute inset-0 h-full w-full" viewBox={`0 0 ${FIELD_LENGTH} ${FIELD_WIDTH}`} preserveAspectRatio="none">
          {cells.map((weight, index) => {
            if (weight < 0.02) return null
            const gx = index % cols
            const gy = Math.floor(index / cols)
            return (
              <rect
                key={index}
                x={gx * cellW}
                y={gy * cellH}
                width={cellW}
                height={cellH}
                fill={heatColor(weight)}
              />
            )
          })}
          {/* Yard lines on top of the heat, for reference */}
          {Array.from({ length: 11 }, (_, i) => i * 10).map((yard) => (
            <line
              key={yard}
              x1={yard}
              y1={0}
              x2={yard}
              y2={FIELD_WIDTH}
              stroke="#ffffff"
              strokeWidth={yard === 0 || yard === FIELD_LENGTH ? 0.5 : 0.2}
              opacity={yard === 0 || yard === FIELD_LENGTH ? 0.6 : 0.22}
            />
          ))}
        </svg>
      </div>
      <div className="border-t border-white/15 bg-black/20 px-3 py-2 text-[10px] leading-relaxed text-white/65">
        Dwell time per field zone, from the CV field map. Brighter = more time spent there.
      </div>
    </div>
  )
}

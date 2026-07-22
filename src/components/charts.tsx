import type { Category } from '../types'
import { CATEGORY_SHORT } from '../data/constants'

// --- Radar chart (category profile) -------------------------------------

export interface RadarSeries {
  label: string
  color: string
  values: Record<Category, number> // 0-100
}

const RADAR_AXES: Category[] = [
  'Speed',
  'Acceleration',
  'Jump',
  'Power',
  'Pursuit',
  'Change of Direction',
  'Conditioning',
  'Strength',
]

export function RadarChart({
  series,
  size = 260,
}: {
  series: RadarSeries[]
  size?: number
}) {
  const cx = size / 2
  const cy = size / 2
  const radius = size * 0.36
  const n = RADAR_AXES.length
  const angle = (i: number) => (Math.PI * 2 * i) / n - Math.PI / 2
  const point = (i: number, value: number) => {
    const r = (value / 100) * radius
    return [cx + r * Math.cos(angle(i)), cy + r * Math.sin(angle(i))]
  }
  const gridLevels = [25, 50, 75, 100]

  return (
    <svg width={size} height={size} className="mx-auto">
      {/* rings */}
      {gridLevels.map((lvl) => (
        <polygon
          key={lvl}
          points={RADAR_AXES.map((_, i) => point(i, lvl).join(',')).join(' ')}
          fill="none"
          stroke="#242b33"
          strokeWidth={1}
        />
      ))}
      {/* spokes + labels */}
      {RADAR_AXES.map((cat, i) => {
        const [x, y] = point(i, 118)
        const [ex, ey] = point(i, 100)
        return (
          <g key={cat}>
            <line x1={cx} y1={cy} x2={ex} y2={ey} stroke="#242b33" strokeWidth={1} />
            <text
              x={x}
              y={y}
              fill="#8b96a3"
              fontSize={11}
              fontWeight={700}
              textAnchor="middle"
              dominantBaseline="middle"
            >
              {CATEGORY_SHORT[cat]}
            </text>
          </g>
        )
      })}
      {/* series */}
      {series.map((s, si) => (
        <polygon
          key={si}
          points={RADAR_AXES.map((cat, i) => point(i, s.values[cat] || 0).join(',')).join(' ')}
          fill={s.color}
          fillOpacity={0.18}
          stroke={s.color}
          strokeWidth={2}
        />
      ))}
      {series.map((s, si) =>
        RADAR_AXES.map((cat, i) => {
          const [x, y] = point(i, s.values[cat] || 0)
          return <circle key={`${si}-${i}`} cx={x} cy={y} r={3} fill={s.color} />
        }),
      )}
    </svg>
  )
}

// --- Line chart (FAI over time) -----------------------------------------

export interface LinePoint {
  label: string
  value: number
}

export function LineChart({
  points,
  height = 200,
  color = '#c6f24e',
  yMin,
  yMax,
}: {
  points: LinePoint[]
  height?: number
  color?: string
  yMin?: number
  yMax?: number
}) {
  const width = Math.max(320, points.length * 90)
  const padX = 40
  const padY = 28
  const values = points.map((p) => p.value)
  const lo = yMin ?? Math.max(0, Math.min(...values) - 8)
  const hi = yMax ?? Math.min(100, Math.max(...values) + 8)
  const span = hi - lo || 1
  const x = (i: number) =>
    padX + (i * (width - padX * 2)) / Math.max(1, points.length - 1)
  const y = (v: number) => padY + (1 - (v - lo) / span) * (height - padY * 2)

  const path = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${x(i)} ${y(p.value)}`)
    .join(' ')
  const area =
    `M ${x(0)} ${height - padY} ` +
    points.map((p, i) => `L ${x(i)} ${y(p.value)}`).join(' ') +
    ` L ${x(points.length - 1)} ${height - padY} Z`

  return (
    <div className="overflow-x-auto no-scrollbar">
      <svg width={width} height={height}>
        <defs>
          <linearGradient id="faiArea" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.35} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        {[0, 0.5, 1].map((t) => {
          const gy = padY + t * (height - padY * 2)
          return (
            <line key={t} x1={padX} y1={gy} x2={width - padX} y2={gy} stroke="#242b33" strokeWidth={1} />
          )
        })}
        {points.length > 1 && <path d={area} fill="url(#faiArea)" />}
        <path d={path} fill="none" stroke={color} strokeWidth={3} strokeLinejoin="round" strokeLinecap="round" />
        {points.map((p, i) => (
          <g key={i}>
            <circle cx={x(i)} cy={y(p.value)} r={4.5} fill="#060809" stroke={color} strokeWidth={2.5} />
            <text x={x(i)} y={y(p.value) - 12} fill="#eef2f6" fontSize={12} fontWeight={800} textAnchor="middle" className="nums">
              {p.value.toFixed(1)}
            </text>
            <text x={x(i)} y={height - 8} fill="#8b96a3" fontSize={11} fontWeight={600} textAnchor="middle">
              {p.label}
            </text>
          </g>
        ))}
      </svg>
    </div>
  )
}

// --- Horizontal meter (category / test score bar) -----------------------

export function ScoreMeter({
  value,
  color = '#c6f24e',
}: {
  value: number
  color?: string
}) {
  const pct = Math.max(0, Math.min(100, value))
  return (
    <div className="h-2.5 w-full overflow-hidden rounded-full bg-panel-2">
      <div
        className="h-full rounded-full"
        style={{ width: `${pct}%`, background: color, transition: 'width 0.6s ease' }}
      />
    </div>
  )
}

import type { FilmAnnotation } from '../types'
import { TRACK_COLORS, trackFieldAt, trackFieldTrailAt } from '../lib/filmTracking'

const FIELD_LENGTH = 100 // yards, goal line to goal line
const FIELD_WIDTH = 53.3 // yards, sideline to sideline

interface Props {
  tracks: readonly FilmAnnotation[]
  atTime: number
}

/**
 * Wisehockey-style top-down field map: every tracked player plotted in real yards
 * from the CV homography, moving in sync with the video. Only players with field
 * coordinates appear — image-space tracks can't be placed on a true top-down field.
 */
export default function FieldMap({ tracks, atTime }: Props) {
  const located = tracks
    .map((track) => ({
      track,
      pos: trackFieldAt(track.points, atTime),
      trail: trackFieldTrailAt(track.points, atTime),
    }))
    .filter((item): item is { track: FilmAnnotation; pos: [number, number]; trail: Array<[number, number]> } =>
      Boolean(item.pos))

  // The SVG viewBox is already in yards (0–100 × 0–53.3), so field coordinates
  // plot directly. Clamp into the field so a noisy homography can't draw off-canvas.
  const clampX = (x: number) => Math.max(0, Math.min(FIELD_LENGTH, x))
  const clampY = (y: number) => Math.max(0, Math.min(FIELD_WIDTH, y))

  return (
    <div className="overflow-hidden rounded-xl border border-line bg-[#12331f]" data-testid="field-map">
      <div className="flex items-center justify-between border-b border-white/15 bg-black/20 px-3 py-2">
        <div className="text-xs font-black uppercase tracking-wider text-white">Top-down field map</div>
        <div className="text-[11px] font-bold text-white/70">{located.length} located</div>
      </div>
      <div className="relative w-full" style={{ aspectRatio: `${FIELD_LENGTH} / ${FIELD_WIDTH}` }}>
        <svg className="absolute inset-0 h-full w-full" viewBox={`0 0 ${FIELD_LENGTH} ${FIELD_WIDTH}`} preserveAspectRatio="none">
          {/* Yard lines every 10 yards */}
          {Array.from({ length: 11 }, (_, i) => i * 10).map((yard) => (
            <line
              key={yard}
              x1={yard}
              y1={0}
              x2={yard}
              y2={FIELD_WIDTH}
              stroke="#ffffff"
              strokeWidth={yard === 0 || yard === FIELD_LENGTH ? 0.5 : 0.25}
              opacity={yard === 0 || yard === FIELD_LENGTH ? 0.7 : 0.3}
            />
          ))}
          {/* Hash marks (NFHS ~ 53.3/3 from each sideline) */}
          {[FIELD_WIDTH / 3, (FIELD_WIDTH * 2) / 3].map((y) => (
            <line key={y} x1={0} y1={y} x2={FIELD_LENGTH} y2={y} stroke="#ffffff" strokeWidth={0.12} opacity={0.18} />
          ))}
          {/* Movement trails */}
          {located.map(({ track, trail }) => {
            if (trail.length < 2) return null
            return (
              <polyline
                key={`trail-${track.id}`}
                points={trail.map(([x, y]) => `${clampX(x)},${clampY(y)}`).join(' ')}
                fill="none"
                stroke={track.color ?? TRACK_COLORS[track.trackingSide ?? 'offense']}
                strokeWidth={0.5}
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity={0.8}
              />
            )
          })}
          {/* Players */}
          {located.map(({ track, pos }) => {
            const color = track.color ?? TRACK_COLORS[track.trackingSide ?? 'offense']
            return (
              <circle key={track.id} cx={clampX(pos[0])} cy={clampY(pos[1])} r={1.1} fill={color} stroke="#0b0f14" strokeWidth={0.2} />
            )
          })}
        </svg>
      </div>
      <div className="border-t border-white/15 bg-black/20 px-3 py-2 text-[10px] leading-relaxed text-white/65">
        Real yards from the CV field map, synced to the video. Accurate to the homography you set — needs the 4-point calibration in the tracking notebook.
      </div>
    </div>
  )
}

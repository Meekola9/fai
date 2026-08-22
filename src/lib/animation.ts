// Small, framework-free animation math shared by animated UI (count-up meters, etc.).

/** Ease-out cubic: fast start, gentle settle. t is clamped to 0-1. */
export function easeOutCubic(t: number): number {
  const clamped = Math.max(0, Math.min(1, t))
  return 1 - Math.pow(1 - clamped, 3)
}

/**
 * Eased integer value partway through a count-up from `from` to `to`.
 * progress 0 → `from`, progress 1 → exactly `to` (no rounding drift at the end).
 */
export function stepCountUp(from: number, to: number, progress: number): number {
  if (progress >= 1) return to
  return Math.round(from + (to - from) * easeOutCubic(progress))
}

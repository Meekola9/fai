// ---------------------------------------------------------------------------
// Professional film-room keyboard controls, resolved as pure data so the
// mapping is trivially testable and the component just applies the result.
//
// Frame stepping uses the film's frame duration (default 30 fps when the true
// rate is unknown — browsers do not expose a reliable FPS for an arbitrary
// <video>). Seconds jumps are absolute.
// ---------------------------------------------------------------------------

/** Default frame duration when the source film's true FPS is unknown. */
export const DEFAULT_FILM_FPS = 30

export type FilmShortcut =
  | { kind: 'toggle' }
  | { kind: 'frame'; frames: number }
  | { kind: 'seconds'; seconds: number }

/**
 * Map a keydown to a playback action, or undefined when the key is not a
 * film-room shortcut. Mirrors the conventions coaches expect from editing
 * software (Space/K play-pause, arrows step frames, Shift = 10 frames, J/L
 * jog one second).
 */
export function resolveFilmShortcut(event: { key: string; shiftKey: boolean }): FilmShortcut | undefined {
  switch (event.key) {
    case ' ':
    case 'Spacebar': // legacy Edge/IE key name
    case 'k':
    case 'K':
      return { kind: 'toggle' }
    case 'ArrowRight':
      return { kind: 'frame', frames: event.shiftKey ? 10 : 1 }
    case 'ArrowLeft':
      return { kind: 'frame', frames: event.shiftKey ? -10 : -1 }
    case 'j':
    case 'J':
      return { kind: 'seconds', seconds: -1 }
    case 'l':
    case 'L':
      return { kind: 'seconds', seconds: 1 }
    default:
      return undefined
  }
}

/** Seconds to move for a shortcut, given the film's frame duration. */
export function shortcutSeconds(shortcut: FilmShortcut, frameSeconds: number): number {
  if (shortcut.kind === 'frame') return shortcut.frames * frameSeconds
  if (shortcut.kind === 'seconds') return shortcut.seconds
  return 0
}

/**
 * True when the event originated in a field where the coach is typing. Uses
 * duck typing rather than `instanceof HTMLElement` so it is correct across
 * iframes/realms and testable without a DOM.
 */
export function isEditableTarget(target: EventTarget | null): boolean {
  const element = target as { tagName?: unknown; isContentEditable?: unknown } | null
  if (!element || typeof element.tagName !== 'string') return false
  const tag = element.tagName.toUpperCase()
  return (
    tag === 'INPUT'
    || tag === 'TEXTAREA'
    || tag === 'SELECT'
    || element.isContentEditable === true
  )
}

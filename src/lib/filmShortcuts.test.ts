import { describe, expect, it } from 'vitest'
import {
  DEFAULT_FILM_FPS,
  isEditableTarget,
  resolveFilmShortcut,
  shortcutSeconds,
} from './filmShortcuts'

describe('film keyboard shortcuts', () => {
  it('maps play/pause keys', () => {
    expect(resolveFilmShortcut({ key: ' ', shiftKey: false })).toEqual({ kind: 'toggle' })
    expect(resolveFilmShortcut({ key: 'k', shiftKey: false })).toEqual({ kind: 'toggle' })
    expect(resolveFilmShortcut({ key: 'K', shiftKey: false })).toEqual({ kind: 'toggle' })
  })

  it('steps one frame with arrows and ten frames with shift', () => {
    expect(resolveFilmShortcut({ key: 'ArrowRight', shiftKey: false })).toEqual({ kind: 'frame', frames: 1 })
    expect(resolveFilmShortcut({ key: 'ArrowLeft', shiftKey: false })).toEqual({ kind: 'frame', frames: -1 })
    expect(resolveFilmShortcut({ key: 'ArrowRight', shiftKey: true })).toEqual({ kind: 'frame', frames: 10 })
    expect(resolveFilmShortcut({ key: 'ArrowLeft', shiftKey: true })).toEqual({ kind: 'frame', frames: -10 })
  })

  it('jogs one second with J and L', () => {
    expect(resolveFilmShortcut({ key: 'j', shiftKey: false })).toEqual({ kind: 'seconds', seconds: -1 })
    expect(resolveFilmShortcut({ key: 'l', shiftKey: false })).toEqual({ kind: 'seconds', seconds: 1 })
  })

  it('ignores unrelated keys', () => {
    expect(resolveFilmShortcut({ key: 'a', shiftKey: false })).toBeUndefined()
    expect(resolveFilmShortcut({ key: 'Enter', shiftKey: false })).toBeUndefined()
  })

  it('converts frame steps into seconds at the given frame rate', () => {
    const frameSeconds = 1 / DEFAULT_FILM_FPS
    expect(shortcutSeconds({ kind: 'frame', frames: 1 }, frameSeconds)).toBeCloseTo(1 / 30, 6)
    expect(shortcutSeconds({ kind: 'frame', frames: -10 }, frameSeconds)).toBeCloseTo(-10 / 30, 6)
    expect(shortcutSeconds({ kind: 'seconds', seconds: -1 }, frameSeconds)).toBe(-1)
    expect(shortcutSeconds({ kind: 'toggle' }, frameSeconds)).toBe(0)
  })

  it('detects editable targets so typing is never hijacked', () => {
    const el = (tag: string, editable = false) =>
      ({ tagName: tag, isContentEditable: editable }) as unknown as EventTarget
    expect(isEditableTarget(el('INPUT'))).toBe(true)
    expect(isEditableTarget(el('TEXTAREA'))).toBe(true)
    expect(isEditableTarget(el('SELECT'))).toBe(true)
    expect(isEditableTarget(el('DIV'))).toBe(false)
    expect(isEditableTarget(el('DIV', true))).toBe(true)
    expect(isEditableTarget(null)).toBe(false)
  })
})

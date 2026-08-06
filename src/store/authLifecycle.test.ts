import { describe, expect, it } from 'vitest'
import { authLifecycleAction } from './authLifecycle'

describe('authLifecycleAction', () => {
  it('ignores the duplicate initial-session callback owned by getSession bootstrap', () => {
    expect(authLifecycleAction('INITIAL_SESSION', 'coach-1', undefined)).toBe('ignore-bootstrap')
  })

  it.each(['SIGNED_IN', 'TOKEN_REFRESHED', 'USER_UPDATED'])(
    'keeps the mounted app alive for same-user %s events',
    (event) => {
      expect(authLifecycleAction(event, 'coach-1', 'coach-1')).toBe('refresh-user')
    },
  )

  it('activates when a genuinely different user session arrives', () => {
    expect(authLifecycleAction('SIGNED_IN', 'coach-2', 'coach-1')).toBe('activate-user')
  })

  it('returns to signed-out data when the session disappears', () => {
    expect(authLifecycleAction('SIGNED_OUT', undefined, 'coach-1')).toBe('show-signed-out')
  })
})

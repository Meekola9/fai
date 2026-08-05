export type AuthLifecycleAction =
  | 'ignore-bootstrap'
  | 'refresh-user'
  | 'activate-user'
  | 'show-signed-out'

/**
 * Supabase can emit SIGNED_IN again when a browser tab regains focus and can
 * emit TOKEN_REFRESHED while the same session remains active. Those events
 * must not reload the entire FAI store because doing so unmounts stateful
 * pages such as Film Room and releases their local video object URLs.
 */
export function authLifecycleAction(
  event: string,
  sessionUserId: string | undefined,
  activeUserId: string | undefined,
): AuthLifecycleAction {
  // StoreProvider already owns the initial getSession() bootstrap. Processing
  // INITIAL_SESSION a second time creates a duplicate activation cycle.
  if (event === 'INITIAL_SESSION') return 'ignore-bootstrap'
  if (!sessionUserId) return 'show-signed-out'
  if (activeUserId === sessionUserId) return 'refresh-user'
  return 'activate-user'
}

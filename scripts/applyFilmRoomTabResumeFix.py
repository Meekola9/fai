from pathlib import Path


def replace_once(path: str, old: str, new: str) -> None:
    file = Path(path)
    text = file.read_text()
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{path}: expected one match, found {count}: {old[:180]!r}")
    file.write_text(text.replace(old, new, 1))


path = 'src/store/useStore.tsx'

replace_once(
    path,
    "import { LatestSaveQueue } from './latestSaveQueue'\n",
    "import { LatestSaveQueue } from './latestSaveQueue'\nimport { authLifecycleAction } from './authLifecycle'\n",
)

replace_once(
    path,
    "  useEffect(() => {\n    let alive = true\n    let activationNumber = 0\n",
    "  useEffect(() => {\n    let alive = true\n    let activationNumber = 0\n    let activeAuthUserId: string | undefined\n",
)

replace_once(
    path,
    "    async function showSignedOut() {\n      const request = ++activationNumber\n      const local = await localStore.load()\n",
    "    async function showSignedOut() {\n      const request = ++activationNumber\n      activeAuthUserId = undefined\n      const local = await localStore.load()\n",
)

replace_once(
    path,
    "      const local = await localStore.load()\n      const access = await loadTeamAccess(user.id)\n      if (!alive || request !== activationNumber) return\n\n      setUserId(user.id)\n",
    "      const local = await localStore.load()\n      const access = await loadTeamAccess(user.id)\n      if (!alive || request !== activationNumber) return\n\n      // Mark the successfully resolved session before cloud hydration. Supabase\n      // can emit SIGNED_IN or TOKEN_REFRESHED again when a backgrounded tab\n      // regains focus; those same-user events must not remount the whole app.\n      activeAuthUserId = user.id\n      setUserId(user.id)\n",
)

old_subscription = """    const authSubscription = supabase?.auth.onAuthStateChange((_event, session) => {
      window.setTimeout(() => {
        if (!alive) return
        if (session?.user) {
          void activateUser(session.user).catch((error: unknown) => {
            if (!alive) return
            setAuthError(
              error instanceof Error ? error.message : 'Could not load the FAI team.',
            )
            setLoading(false)
          })
        } else {
          void showSignedOut().catch((error: unknown) => {
            if (!alive) return
            setAuthError(
              error instanceof Error ? error.message : 'Could not load local backup data.',
            )
            setLoading(false)
          })
        }
      }, 0)
    })
"""

new_subscription = """    const authSubscription = supabase?.auth.onAuthStateChange((event, session) => {
      window.setTimeout(() => {
        if (!alive) return
        const action = authLifecycleAction(event, session?.user?.id, activeAuthUserId)

        // Supabase may emit SIGNED_IN again when a tab regains focus, and it
        // emits TOKEN_REFRESHED for the same session. Rehydrating the full
        // store for those events sets global loading=true, unmounts Film Room,
        // and releases its local video URL. Refresh identity fields in place.
        if (action === 'ignore-bootstrap') return
        if (action === 'refresh-user' && session?.user) {
          setUserId(session.user.id)
          setUserEmail(session.user.email ?? undefined)
          return
        }

        if (action === 'activate-user' && session?.user) {
          void activateUser(session.user).catch((error: unknown) => {
            if (!alive) return
            setAuthError(
              error instanceof Error ? error.message : 'Could not load the FAI team.',
            )
            setLoading(false)
          })
        } else {
          void showSignedOut().catch((error: unknown) => {
            if (!alive) return
            setAuthError(
              error instanceof Error ? error.message : 'Could not load local backup data.',
            )
            setLoading(false)
          })
        }
      }, 0)
    })
"""

replace_once(path, old_subscription, new_subscription)

print('Applied same-session tab resume protection to StoreProvider.')

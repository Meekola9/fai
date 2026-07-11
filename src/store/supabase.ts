// ---------------------------------------------------------------------------
// Supabase client (optional cloud backend). Configured via Vite env vars.
// Without them, the app runs entirely on localStorage — see storage.ts.
// ---------------------------------------------------------------------------

import type { SupabaseClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

/** A shared team code scopes all rows so a whole staff shares one dataset. */
export const TEAM_CODE =
  (import.meta.env.VITE_FAI_TEAM_CODE as string | undefined)?.trim() || 'default'

export const isCloudConfigured = Boolean(url && anonKey)

// The Supabase client library is large; most local-only sessions never need it.
// Load it lazily (dynamic import) so it code-splits into its own chunk.
let clientPromise: Promise<SupabaseClient> | null = null

export function getSupabase(): Promise<SupabaseClient | null> {
  if (!isCloudConfigured) return Promise.resolve(null)
  if (!clientPromise) {
    clientPromise = import('@supabase/supabase-js').then(({ createClient }) =>
      createClient(url as string, anonKey as string),
    )
  }
  return clientPromise
}

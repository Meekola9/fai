import { useEffect, useMemo, useState } from 'react'
import { useStore } from '../store/useStore'
import {
  capabilitiesFor,
  normalizePermissions,
  normalizeRole,
  type AccessCapabilities,
  type TeamPermissions,
  type TeamRole,
} from '../lib/access'
import { supabase } from '../lib/supabase'
import { loadMyAthleteClaim } from '../store/accounts'

const LEGACY_COACH_DEFAULTS: TeamPermissions = {
  roster: true,
  testing: true,
  film: true,
  awards: true,
  reports: true,
}

export interface AccountAccessState {
  loading: boolean
  role?: TeamRole
  permissions: TeamPermissions
  athleteId?: string
  capabilities: AccessCapabilities
}

export function useAccountAccess(): AccountAccessState {
  const { signedIn, teamRole } = useStore()
  const [loading, setLoading] = useState(signedIn)
  const [role, setRole] = useState<TeamRole | undefined>(teamRole ? normalizeRole(teamRole) : undefined)
  const [permissions, setPermissions] = useState<TeamPermissions>({})
  const [athleteId, setAthleteId] = useState<string>()

  useEffect(() => {
    let active = true
    if (!signedIn || !supabase) return () => { active = false }

    void (async () => {
      try {
        const { data: sessionData } = await supabase.auth.getSession()
        const user = sessionData.session?.user
        if (!user) return
        const { data: membership, error } = await supabase
          .from('team_members')
          .select('role,permissions')
          .eq('user_id', user.id)
          .order('created_at', { ascending: true })
          .limit(1)
          .maybeSingle()
        if (!active) return
        if (error && !/permissions|schema cache/i.test(error.message)) throw error
        const nextRole = membership ? normalizeRole(membership.role) : teamRole ? normalizeRole(teamRole) : undefined
        let nextPermissions = membership ? normalizePermissions(membership.permissions) : {}
        if (nextRole === 'coach' && Object.keys(nextPermissions).length === 0) {
          nextPermissions = LEGACY_COACH_DEFAULTS
        }
        setRole(nextRole)
        setPermissions(nextPermissions)

        if (nextRole === 'athlete' || !membership) {
          const claim = await loadMyAthleteClaim()
          if (active && claim?.status === 'approved') setAthleteId(claim.athleteId)
        }
      } catch {
        // Older databases fall back to the role already loaded by the main store.
        const fallbackRole = teamRole ? normalizeRole(teamRole) : undefined
        setRole(fallbackRole)
        setPermissions(fallbackRole === 'coach' ? LEGACY_COACH_DEFAULTS : {})
      } finally {
        if (active) setLoading(false)
      }
    })()

    return () => { active = false }
  }, [signedIn, teamRole])

  const capabilities = useMemo(
    () => capabilitiesFor(role, permissions, athleteId),
    [athleteId, permissions, role],
  )

  return { loading, role, permissions, athleteId, capabilities }
}

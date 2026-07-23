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
  const { signedIn, teamRole, cloudConfigured } = useStore()
  const [loading, setLoading] = useState(cloudConfigured && signedIn)
  const [accountRole, setAccountRole] = useState<TeamRole | undefined>(teamRole ? normalizeRole(teamRole) : undefined)
  const [accountPermissions, setAccountPermissions] = useState<TeamPermissions>({})
  const [accountAthleteId, setAccountAthleteId] = useState<string>()

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
        setAccountRole(nextRole)
        setAccountPermissions(nextPermissions)

        if (nextRole === 'athlete' || !membership) {
          const claim = await loadMyAthleteClaim()
          if (active && claim?.status === 'approved') setAccountAthleteId(claim.athleteId)
        }
      } catch {
        // Older databases fall back to the role already loaded by the main store.
        const fallbackRole = teamRole ? normalizeRole(teamRole) : undefined
        setAccountRole(fallbackRole)
        setAccountPermissions(fallbackRole === 'coach' ? LEGACY_COACH_DEFAULTS : {})
      } finally {
        if (active) setLoading(false)
      }
    })()

    return () => { active = false }
  }, [signedIn, teamRole])

  // Local-only installs have no remote identity or membership table. Preserve
  // the original full on-device coach experience by treating the device owner
  // as the owner. Cloud-configured signed-out visitors remain read-only.
  const role: TeamRole | undefined = !cloudConfigured
    ? 'owner'
    : signedIn
      ? accountRole
      : undefined
  const permissions = cloudConfigured && signedIn ? accountPermissions : {}
  const athleteId = cloudConfigured && signedIn ? accountAthleteId : undefined
  const accessLoading = cloudConfigured && signedIn ? loading : false

  const capabilities = useMemo(
    () => capabilitiesFor(role, permissions, athleteId),
    [athleteId, permissions, role],
  )

  return { loading: accessLoading, role, permissions, athleteId, capabilities }
}

export type TeamRole = 'owner' | 'admin' | 'coach' | 'athlete' | 'viewer'

export type TeamPermission =
  | 'roster'
  | 'testing'
  | 'film'
  | 'awards'
  | 'reports'
  | 'staff'
  | 'data'

export type TeamPermissions = Partial<Record<TeamPermission, boolean>>

export interface TeamAccessProfile {
  id: string
  name: string
  role: TeamRole
  permissions: TeamPermissions
  athleteId?: string
}

export interface AccessCapabilities {
  canManageRoster: boolean
  canManageTesting: boolean
  canManageFilm: boolean
  canManageAwards: boolean
  canViewReports: boolean
  canManageStaff: boolean
  canManageData: boolean
  canEditOwnProfile: boolean
  canEditAnything: boolean
}

export const COACH_OPERATIONAL_PERMISSIONS: TeamPermissions = {
  roster: true,
  testing: true,
  film: true,
  awards: true,
  reports: true,
}

const ALL_STAFF: TeamPermissions = {
  ...COACH_OPERATIONAL_PERMISSIONS,
  staff: true,
  data: true,
}

export function normalizeRole(value: unknown): TeamRole {
  const role = String(value ?? '').toLowerCase()
  if (role === 'owner' || role === 'admin' || role === 'coach' || role === 'athlete' || role === 'viewer') return role
  // Existing FAI memberships used free-form roles. Preserve historical editors as admins.
  if (role === 'editor' || role === 'manager') return 'admin'
  return 'viewer'
}

export function normalizePermissions(value: unknown): TeamPermissions {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  const source = value as Record<string, unknown>
  const result: TeamPermissions = {}
  for (const key of ['roster', 'testing', 'film', 'awards', 'reports', 'staff', 'data'] as TeamPermission[]) {
    if (source[key] === true) result[key] = true
  }
  return result
}

/**
 * FAI's current cloud sync writes the operational team snapshot together.
 * Coaches therefore receive the complete operating package, while staff/data
 * administration remains owner/admin only. This avoids misleading partial
 * access until cloud persistence is split into table-scoped writes.
 */
export function permissionsFor(role: TeamRole, _assigned: TeamPermissions = {}): TeamPermissions {
  if (role === 'owner' || role === 'admin') return ALL_STAFF
  if (role === 'coach') return COACH_OPERATIONAL_PERMISSIONS
  return {}
}

export function capabilitiesFor(
  role: TeamRole | undefined,
  assigned: TeamPermissions = {},
  athleteId?: string,
): AccessCapabilities {
  if (!role) {
    return {
      canManageRoster: false,
      canManageTesting: false,
      canManageFilm: false,
      canManageAwards: false,
      canViewReports: false,
      canManageStaff: false,
      canManageData: false,
      canEditOwnProfile: false,
      canEditAnything: false,
    }
  }
  const permissions = permissionsFor(role, assigned)
  const capabilities = {
    canManageRoster: permissions.roster === true,
    canManageTesting: permissions.testing === true,
    canManageFilm: permissions.film === true,
    canManageAwards: permissions.awards === true,
    canViewReports: permissions.reports === true,
    canManageStaff: permissions.staff === true,
    canManageData: permissions.data === true,
    canEditOwnProfile: role === 'athlete' && Boolean(athleteId),
  }
  return {
    ...capabilities,
    canEditAnything: Object.values(capabilities).some(Boolean),
  }
}

export const COACH_DUTIES: ReadonlyArray<{
  key: TeamPermission
  label: string
  description: string
}> = [
  { key: 'roster', label: 'Roster', description: 'Add athletes and edit positions, grade, height, weight, photo, and Hudl.' },
  { key: 'testing', label: 'Testing', description: 'Create testing events and enter or correct testing results.' },
  { key: 'film', label: 'Film grading', description: 'Chart plays, grade assignments, and build tendency reports.' },
  { key: 'awards', label: 'Awards', description: 'Log impact plays and award weekly or season achievement badges.' },
  { key: 'reports', label: 'Reports', description: 'View staff-only reports and detailed player evaluations.' },
]

export function roleLabel(role: TeamRole): string {
  switch (role) {
    case 'owner': return 'Owner'
    case 'admin': return 'Administrator'
    case 'coach': return 'Coach'
    case 'athlete': return 'Athlete'
    case 'viewer': return 'Viewer'
  }
}

import { describe, expect, it } from 'vitest'
import { capabilitiesFor, normalizePermissions, normalizeRole, permissionsFor } from './access'

describe('FAI account access', () => {
  it('gives owners and administrators every staff capability', () => {
    for (const role of ['owner', 'admin'] as const) {
      expect(capabilitiesFor(role)).toMatchObject({
        canManageRoster: true,
        canManageTesting: true,
        canManageFilm: true,
        canManageAwards: true,
        canViewReports: true,
        canManageStaff: true,
        canManageData: true,
        canEditOwnProfile: false,
        canEditAnything: true,
      })
    }
  })

  it('gives coaches the fixed operating package without staff or data administration', () => {
    expect(capabilitiesFor('coach', { film: true, reports: true })).toMatchObject({
      canManageRoster: true,
      canManageTesting: true,
      canManageFilm: true,
      canManageAwards: true,
      canViewReports: true,
      canManageStaff: false,
      canManageData: false,
      canEditOwnProfile: false,
      canEditAnything: true,
    })
  })

  it('allows an approved athlete to edit only their own profile', () => {
    expect(capabilitiesFor('athlete', {}, 'athlete-1')).toMatchObject({
      canManageRoster: false,
      canManageTesting: false,
      canManageFilm: false,
      canManageAwards: false,
      canManageStaff: false,
      canManageData: false,
      canEditOwnProfile: true,
      canEditAnything: true,
    })
    expect(capabilitiesFor('athlete')).toMatchObject({
      canEditOwnProfile: false,
      canEditAnything: false,
    })
  })

  it('keeps viewers and unassigned accounts read-only', () => {
    expect(capabilitiesFor('viewer').canEditAnything).toBe(false)
    expect(capabilitiesFor(undefined).canEditAnything).toBe(false)
  })

  it('normalizes historical roles and ignores unknown permission values', () => {
    expect(normalizeRole('EDITOR')).toBe('admin')
    expect(normalizeRole('something-else')).toBe('viewer')
    expect(normalizePermissions({ film: true, testing: false, staff: 'yes', unknown: true })).toEqual({ film: true })
  })

  it('does not let assigned flags reduce owner or administrator access', () => {
    expect(permissionsFor('owner', { film: false })).toMatchObject({ film: true, staff: true, data: true })
  })
})

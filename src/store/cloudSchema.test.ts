import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const sql = readFileSync('supabase/migrations/001_authenticated_cloud.sql', 'utf8')

describe('authenticated cloud schema', () => {
  it('enables RLS on every team-data table', () => {
    for (const table of [
      'fai_teams',
      'fai_team_members',
      'fai_team_invites',
      'fai_athletes',
      'fai_testing_events',
      'fai_test_sessions',
      'fai_audit_log',
    ]) {
      expect(sql).toContain(`alter table public.${table} enable row level security`)
    }
  })

  it('does not grant policies or mutation functions to anonymous users', () => {
    expect(sql).not.toMatch(/\bto\s+anon\b/i)
    expect(sql).not.toMatch(/grant\s+execute[^;]+\bto\s+anon\b/i)
    expect(sql).not.toContain('using (true)')
  })

  it('requires membership and versioned mutations', () => {
    expect(sql).toContain('fai_is_member')
    expect(sql).toContain('fai_can_edit')
    expect(sql).toContain('p_expected_version')
    expect(sql).toContain("'conflict', true")
    expect(sql).toContain('fai_audit_log')
  })
})

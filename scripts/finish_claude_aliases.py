from pathlib import Path


def replace_once(text: str, old: str, new: str, label: str) -> str:
    if old not in text:
        raise SystemExit(f"Missing marker: {label}")
    return text.replace(old, new, 1)


# ---------------------------------------------------------------------------
# Supabase account helpers
# ---------------------------------------------------------------------------
p = Path('src/store/accounts.ts')
s = p.read_text()
s = replace_once(
    s,
    "} from '../lib/access'\n",
    "} from '../lib/access'\nimport { normalizeAthleteName } from '../lib/athleteIdentity'\n",
    'accounts identity import',
)
s = replace_once(
    s,
    "export interface UploadedAthletePhoto {\n  path: string\n  publicUrl: string\n}\n",
    """export interface UploadedAthletePhoto {
  path: string
  publicUrl: string
}

export interface AthleteAlias {
  id: string
  teamId: string
  alias: string
  normalizedAlias: string
  athleteId: string
  createdAt: string
  updatedAt: string
}
""",
    'athlete alias interface',
)
s = replace_once(
    s,
    "function mapClaim(row: Record<string, unknown>): AthleteClaim {\n",
    """function mapAthleteAlias(row: Record<string, unknown>): AthleteAlias {
  return {
    id: String(row.id),
    teamId: String(row.team_id),
    alias: String(row.alias),
    normalizedAlias: String(row.normalized_alias),
    athleteId: String(row.athlete_id),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  }
}

function mapClaim(row: Record<string, unknown>): AthleteClaim {
""",
    'athlete alias mapper',
)
s = replace_once(
    s,
    "export async function createTeamInvite(input: {\n",
    """export async function loadTeamAthleteAliases(teamId: string): Promise<AthleteAlias[]> {
  const { data, error } = await db()
    .from('athlete_aliases')
    .select('*')
    .eq('team_id', teamId)
    .order('updated_at', { ascending: false })
  // Safe during staged migration rollout: imports still work without saved aliases.
  if (error && /does not exist|schema cache/i.test(error.message)) return []
  throwIfError(error, 'Could not load athlete aliases')
  return (data ?? []).map((row) => mapAthleteAlias(row as Record<string, unknown>))
}

export async function saveTeamAthleteAlias(
  teamId: string,
  alias: string,
  athleteId: string,
): Promise<AthleteAlias> {
  const cleanAlias = alias.trim()
  const normalizedAlias = normalizeAthleteName(cleanAlias)
  if (!normalizedAlias) throw new Error('The imported athlete name is blank.')
  if (!athleteId.trim()) throw new Error('Choose an athlete before saving the alias.')

  const now = new Date().toISOString()
  const { data, error } = await db()
    .from('athlete_aliases')
    .upsert({
      team_id: teamId,
      alias: cleanAlias,
      normalized_alias: normalizedAlias,
      athlete_id: athleteId,
      updated_at: now,
    }, { onConflict: 'team_id,normalized_alias' })
    .select('*')
    .single()
  throwIfError(error, 'Could not save athlete alias')
  if (!data) throw new Error('Supabase did not return the saved athlete alias.')
  return mapAthleteAlias(data as Record<string, unknown>)
}

export async function createTeamInvite(input: {
""",
    'athlete alias account functions',
)
p.write_text(s)


# ---------------------------------------------------------------------------
# Pure row resolver: support coach-selected row matches
# ---------------------------------------------------------------------------
p = Path('src/lib/bulkImport.ts')
s = p.read_text()
s = replace_once(
    s,
    "  aliases?: ReadonlyMap<string, string>,\n): ResolvedRow[] {",
    "  aliases?: ReadonlyMap<string, string>,\n  manualMatches?: ReadonlyMap<number, string>,\n): ResolvedRow[] {",
    'resolveRows parameters',
)
s = replace_once(
    s,
    """    const match = matchAthlete(
      {
        athleteId: rosterDraft.athleteId,
        fullName: rosterDraft.fullName,
        athleteName: sessionDraft.athleteName,
        grade: rosterDraft.grade,
        graduationYear: rosterDraft.graduationYear,
      },
      roster,
      aliases,
    )
""",
    """    const automaticMatch = matchAthlete(
      {
        athleteId: rosterDraft.athleteId,
        fullName: rosterDraft.fullName,
        athleteName: sessionDraft.athleteName,
        grade: rosterDraft.grade,
        graduationYear: rosterDraft.graduationYear,
      },
      roster,
      aliases,
    )
    const selectedAthleteId = manualMatches?.get(index)
    const selectedAthlete = selectedAthleteId
      ? roster.find((athlete) => athlete.id === selectedAthleteId)
      : undefined
    const match: MatchResult = selectedAthlete
      ? { athleteId: selectedAthlete.id, confidence: 'high', candidates: [selectedAthlete] }
      : automaticMatch
""",
    'manual match application',
)
p.write_text(s)


# ---------------------------------------------------------------------------
# Unit coverage
# ---------------------------------------------------------------------------
p = Path('src/lib/bulkImport.test.ts')
s = p.read_text()
s = replace_once(
    s,
    """  it('flags a duplicate athlete+date row within the batch', () => {
    const { headers, rows } = parseDelimited(
      'athlete,testing date,bench\\nDemek Kemp,2026-07-15,225\\nDemek Kemp,2026-07-15,230',
    )
    const { mapping } = autoMapColumns(headers)
    const resolved = resolveRows(rows, mapping, 'results', roster)
    expect(resolved[0].status).toBe('ready')
    expect(resolved[1].status).toBe('duplicate')
    expect(isAutoIncluded(resolved[1])).toBe(false)
  })
""",
    """  it('flags a duplicate athlete+date row within the batch', () => {
    const { headers, rows } = parseDelimited(
      'athlete,testing date,bench\\nDemek Kemp,2026-07-15,225\\nDemek Kemp,2026-07-15,230',
    )
    const { mapping } = autoMapColumns(headers)
    const resolved = resolveRows(rows, mapping, 'results', roster)
    expect(resolved[0].status).toBe('ready')
    expect(resolved[1].status).toBe('duplicate')
    expect(isAutoIncluded(resolved[1])).toBe(false)
  })

  it('uses a coach-selected athlete to resolve an unmatched result row', () => {
    const { headers, rows } = parseDelimited(
      'athlete,testing date,bench\\nDK,2026-07-15,225',
    )
    const { mapping } = autoMapColumns(headers)
    const unresolved = resolveRows(rows, mapping, 'results', roster)
    expect(unresolved[0].status).toBe('needs-review')

    const resolved = resolveRows(rows, mapping, 'results', roster, undefined, new Map([[0, 'a1']]))
    expect(resolved[0].match).toMatchObject({ athleteId: 'a1', confidence: 'high' })
    expect(resolved[0].status).toBe('ready')
  })

  it('detects duplicates after two aliases are manually assigned to the same athlete', () => {
    const { headers, rows } = parseDelimited(
      'athlete,testing date,bench\\nD Kemp,2026-07-15,225\\nDK,2026-07-15,230',
    )
    const { mapping } = autoMapColumns(headers)
    const manual = new Map([[0, 'a1'], [1, 'a1']])
    const resolved = resolveRows(rows, mapping, 'results', roster, undefined, manual)
    expect(resolved[0].status).toBe('ready')
    expect(resolved[1].status).toBe('duplicate')
  })
""",
    'manual match tests',
)
p.write_text(s)


# ---------------------------------------------------------------------------
# Coach-facing match review and alias persistence
# ---------------------------------------------------------------------------
p = Path('src/pages/BulkImport.tsx')
s = p.read_text()
s = replace_once(
    s,
    "import { useMemo, useRef, useState } from 'react'",
    "import { useEffect, useMemo, useRef, useState } from 'react'",
    'BulkImport React imports',
)
s = replace_once(
    s,
    "import { normalizeAthleteName } from '../lib/athleteIdentity'\n",
    """import { normalizeAthleteName } from '../lib/athleteIdentity'
import {
  loadTeamAthleteAliases,
  saveTeamAthleteAlias,
} from '../store/accounts'
""",
    'BulkImport alias imports',
)
s = replace_once(
    s,
    """function toNewAthlete(draft: RosterDraft): Omit<Athlete, 'id'> {
""",
    """function matchChoices(row: ResolvedRow, roster: readonly RosterAthlete[]): RosterAthlete[] {
  const suggestedIds = new Set(row.match.candidates.map((athlete) => athlete.id))
  return [
    ...row.match.candidates,
    ...roster.filter((athlete) => !suggestedIds.has(athlete.id)),
  ]
}

function toNewAthlete(draft: RosterDraft): Omit<Athlete, 'id'> {
""",
    'match choice helper',
)
s = replace_once(
    s,
    "  const { data, commitBulkImport, canEdit } = useStore()",
    "  const { data, teamId, commitBulkImport, canEdit } = useStore()",
    'teamId store access',
)
s = replace_once(
    s,
    """  const [result, setResult] = useState<BulkImportResult | null>(null)

  const [newEventName, setNewEventName] = useState('')
""",
    """  const [result, setResult] = useState<BulkImportResult | null>(null)
  const [aliasMap, setAliasMap] = useState<Map<string, string>>(new Map())
  const [manualMatches, setManualMatches] = useState<Map<number, string>>(new Map())
  const [matchNotice, setMatchNotice] = useState<string>()
  const [matchError, setMatchError] = useState<string>()
  const [savingMatchRow, setSavingMatchRow] = useState<number>()

  const [newEventName, setNewEventName] = useState('')
""",
    'alias state',
)
s = replace_once(
    s,
    """  const [existingEventId, setExistingEventId] = useState('')

  const roster: RosterAthlete[] = useMemo(
""",
    """  const [existingEventId, setExistingEventId] = useState('')

  useEffect(() => {
    let active = true
    setMatchError(undefined)
    if (!teamId) {
      setAliasMap(new Map())
      return () => { active = false }
    }

    void loadTeamAthleteAliases(teamId)
      .then((aliases) => {
        if (!active) return
        setAliasMap(new Map(aliases.map((alias) => [alias.normalizedAlias, alias.athleteId])))
      })
      .catch((cause: unknown) => {
        if (!active) return
        setMatchError(cause instanceof Error ? cause.message : 'Could not load saved athlete aliases.')
      })

    return () => { active = false }
  }, [teamId])

  const roster: RosterAthlete[] = useMemo(
""",
    'alias loading effect',
)
s = replace_once(
    s,
    """  const resolved = useMemo(
    () => (table ? resolveRows(table.rows, mapping, mode, roster) : []),
    [table, mapping, mode, roster],
  )
""",
    """  const resolved = useMemo(
    () => (table ? resolveRows(table.rows, mapping, mode, roster, aliasMap, manualMatches) : []),
    [table, mapping, mode, roster, aliasMap, manualMatches],
  )
""",
    'resolved aliases/manual matches',
)
s = replace_once(
    s,
    """  function toggleRow(row: ResolvedRow) {
    if (isAutoIncluded(row)) {
      setExcluded((prev) => {
        const next = new Set(prev)
        if (next.has(row.index)) next.delete(row.index)
        else next.add(row.index)
        return next
      })
    } else {
      setIncludeOverrides((prev) => {
        const next = new Set(prev)
        if (next.has(row.index)) next.delete(row.index)
        else next.add(row.index)
        return next
      })
    }
  }

  const includedRows = resolved.filter(isIncluded)
""",
    """  function toggleRow(row: ResolvedRow) {
    if (isAutoIncluded(row)) {
      setExcluded((prev) => {
        const next = new Set(prev)
        if (next.has(row.index)) next.delete(row.index)
        else next.add(row.index)
        return next
      })
    } else {
      setIncludeOverrides((prev) => {
        const next = new Set(prev)
        if (next.has(row.index)) next.delete(row.index)
        else next.add(row.index)
        return next
      })
    }
  }

  async function assignMatch(row: ResolvedRow, athleteId: string) {
    setMatchNotice(undefined)
    setMatchError(undefined)
    setManualMatches((current) => {
      const next = new Map(current)
      if (athleteId) next.set(row.index, athleteId)
      else next.delete(row.index)
      return next
    })
    if (!athleteId) return

    setExcluded((current) => {
      const next = new Set(current)
      next.delete(row.index)
      return next
    })

    const cleanAlias = row.displayName.trim()
    if (!teamId || !cleanAlias) {
      setMatchNotice('Match applied to this import. Sign in to remember this alias for future files.')
      return
    }

    setSavingMatchRow(row.index)
    try {
      const saved = await saveTeamAthleteAlias(teamId, cleanAlias, athleteId)
      setAliasMap((current) => {
        const next = new Map(current)
        next.set(saved.normalizedAlias, saved.athleteId)
        return next
      })
      const athleteName = athleteById.get(athleteId)?.name ?? 'the selected athlete'
      setMatchNotice(`Saved “${cleanAlias}” as an alias for ${athleteName}. Future imports will match automatically.`)
    } catch (cause: unknown) {
      setMatchError(
        `Match applied to this import, but the alias was not saved: ${cause instanceof Error ? cause.message : 'Unknown error.'}`,
      )
    } finally {
      setSavingMatchRow(undefined)
    }
  }

  const includedRows = resolved.filter(isIncluded)
""",
    'assign match function',
)
s = replace_once(
    s,
    """    setExcluded(new Set())
    setIncludeOverrides(new Set())
    try {
""",
    """    setExcluded(new Set())
    setIncludeOverrides(new Set())
    setManualMatches(new Map())
    setMatchNotice(undefined)
    setMatchError(undefined)
    try {
""",
    'parse reset matches',
)
s = replace_once(
    s,
    """  function remap(fieldKey: string, columnIndex: number) {
    setMapping((prev) => {
""",
    """  function remap(fieldKey: string, columnIndex: number) {
    setManualMatches(new Map())
    setMatchNotice(undefined)
    setMapping((prev) => {
""",
    'remap reset matches',
)
s = replace_once(
    s,
    """    setExcluded(new Set())
    setIncludeOverrides(new Set())
  }
""",
    """    setExcluded(new Set())
    setIncludeOverrides(new Set())
    setManualMatches(new Map())
    setMatchNotice(undefined)
    setMatchError(undefined)
  }
""",
    'full reset matches',
)
s = replace_once(
    s,
    """                  onClick={() => setMode(option.key)}
""",
    """                  onClick={() => {
                    setMode(option.key)
                    setManualMatches(new Map())
                    setExcluded(new Set())
                    setIncludeOverrides(new Set())
                    setMatchNotice(undefined)
                  }}
""",
    'mode reset matches',
)
s = replace_once(
    s,
    """              <SectionTitle>3 · Review &amp; import</SectionTitle>
              <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-6">
""",
    """              <SectionTitle>3 · Review &amp; import</SectionTitle>
              {matchNotice && (
                <div className="mb-4 rounded-xl border border-up/35 bg-up/5 p-3 text-xs font-bold text-up">{matchNotice}</div>
              )}
              {matchError && (
                <div className="mb-4 rounded-xl border border-down/35 bg-down/5 p-3 text-xs font-bold text-down">{matchError}</div>
              )}
              <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-6">
""",
    'match notices',
)
s = replace_once(
    s,
    """                    {resolved.map((row) => {
                      const included = isIncluded(row)
                      const disabled = row.status === 'error' || (mode === 'results' && !row.match.athleteId)
                      return (
""",
    """                    {resolved.map((row) => {
                      const included = isIncluded(row)
                      const disabled = row.status === 'error' || (mode === 'results' && !row.match.athleteId)
                      const showResolver = row.match.confidence === 'ambiguous'
                        || row.match.confidence === 'none'
                        || manualMatches.has(row.index)
                      const choices = showResolver ? matchChoices(row, roster) : []
                      return (
""",
    'resolver row setup',
)
s = replace_once(
    s,
    """                          <td className="px-2 py-2">
                            {row.match.athleteId ? (
                              <span className="text-xs text-up">{row.match.confidence === 'exact' ? 'Matched' : 'Likely'} · {athleteById.get(row.match.athleteId)?.name}</span>
                            ) : row.match.confidence === 'ambiguous' ? (
                              <span className="text-xs text-gold">{row.match.candidates.length} possible matches</span>
                            ) : mode === 'results' ? (
                              <span className="text-xs text-down">No match</span>
                            ) : (
                              <span className="text-xs text-fai">New athlete</span>
                            )}
                          </td>
""",
    """                          <td className="min-w-64 px-2 py-2">
                            {showResolver ? (
                              <div className="space-y-1.5">
                                <select
                                  aria-label={`Match ${row.displayName}`}
                                  value={row.match.athleteId ?? ''}
                                  disabled={savingMatchRow === row.index}
                                  onChange={(event) => void assignMatch(row, event.target.value)}
                                  className={inputClass + ' min-w-56 py-1.5 text-xs'}
                                >
                                  <option value="">Choose athlete…</option>
                                  {choices.map((athlete, choiceIndex) => (
                                    <option key={athlete.id} value={athlete.id}>
                                      {choiceIndex < row.match.candidates.length ? 'Suggested · ' : ''}{athlete.name}{athlete.grade ? ` · Grade ${athlete.grade}` : ''}
                                    </option>
                                  ))}
                                </select>
                                <div className="text-[10px] leading-relaxed text-muted">
                                  {savingMatchRow === row.index
                                    ? 'Saving match…'
                                    : teamId
                                      ? 'Choose once to remember this imported name for future files.'
                                      : 'Choose an athlete for this import.'}
                                </div>
                              </div>
                            ) : row.match.athleteId ? (
                              <span className="text-xs text-up">{row.match.confidence === 'exact' ? 'Matched' : 'Likely'} · {athleteById.get(row.match.athleteId)?.name}</span>
                            ) : mode === 'results' ? (
                              <span className="text-xs text-down">No match</span>
                            ) : (
                              <span className="text-xs text-fai">New athlete</span>
                            )}
                          </td>
""",
    'match resolver UI',
)
p.write_text(s)


# ---------------------------------------------------------------------------
# Migration
# ---------------------------------------------------------------------------
Path('supabase/migrations/010_athlete_aliases.sql').write_text("""-- Coach-approved aliases used by Bulk Import athlete matching.
-- Aliases are team-scoped and private to roster-authorized staff.

create table if not exists public.athlete_aliases (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  alias text not null,
  normalized_alias text not null,
  athlete_id text not null,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint athlete_aliases_alias_not_blank check (length(trim(alias)) > 0),
  constraint athlete_aliases_normalized_not_blank check (length(trim(normalized_alias)) > 0),
  constraint athlete_aliases_team_normalized_unique unique (team_id, normalized_alias)
);

create index if not exists athlete_aliases_team_idx
  on public.athlete_aliases(team_id);
create index if not exists athlete_aliases_team_athlete_idx
  on public.athlete_aliases(team_id, athlete_id);

alter table public.athlete_aliases enable row level security;

drop policy if exists "athlete aliases roster read" on public.athlete_aliases;
drop policy if exists "athlete aliases roster insert" on public.athlete_aliases;
drop policy if exists "athlete aliases roster update" on public.athlete_aliases;
drop policy if exists "athlete aliases roster delete" on public.athlete_aliases;

create policy "athlete aliases roster read"
on public.athlete_aliases
for select
to authenticated
using (
  exists (
    select 1
    from public.team_members member
    where member.user_id = auth.uid()
      and member.team_id = athlete_aliases.team_id
      and public.fai_has_permission(member.team_id, 'roster')
  )
);

create policy "athlete aliases roster insert"
on public.athlete_aliases
for insert
to authenticated
with check (
  exists (
    select 1
    from public.team_members member
    where member.user_id = auth.uid()
      and member.team_id = athlete_aliases.team_id
      and public.fai_has_permission(member.team_id, 'roster')
  )
);

create policy "athlete aliases roster update"
on public.athlete_aliases
for update
to authenticated
using (
  exists (
    select 1
    from public.team_members member
    where member.user_id = auth.uid()
      and member.team_id = athlete_aliases.team_id
      and public.fai_has_permission(member.team_id, 'roster')
  )
)
with check (
  exists (
    select 1
    from public.team_members member
    where member.user_id = auth.uid()
      and member.team_id = athlete_aliases.team_id
      and public.fai_has_permission(member.team_id, 'roster')
  )
);

create policy "athlete aliases roster delete"
on public.athlete_aliases
for delete
to authenticated
using (
  exists (
    select 1
    from public.team_members member
    where member.user_id = auth.uid()
      and member.team_id = athlete_aliases.team_id
      and public.fai_has_permission(member.team_id, 'roster')
  )
);

grant select, insert, update, delete on public.athlete_aliases to authenticated;
""")


# ---------------------------------------------------------------------------
# Browser regression: unmatched row can be resolved in the review table
# ---------------------------------------------------------------------------
Path('e2e/bulk-import-match-review.spec.ts').write_text("""import { test, expect } from '@playwright/test'

test('bulk import lets a coach resolve an unmatched name before importing', async ({ page }) => {
  await page.goto('/#/import')
  await expect(page.getByRole('heading', { name: 'Bulk Import' })).toBeVisible({ timeout: 15000 })

  await page.getByRole('button', { name: 'Results only' }).click()
  await page.getByPlaceholder(/Paste rows/).fill(
    'athlete,testing date,bench\\nUnknown Alias,2026-07-15,225',
  )
  await page.getByRole('button', { name: 'Parse data' }).click()

  const selector = page.getByRole('combobox', { name: 'Match Unknown Alias' })
  await expect(selector).toBeVisible()
  const values = await selector.locator('option').evaluateAll((options) =>
    options.map((option) => (option as HTMLOptionElement).value).filter(Boolean),
  )
  expect(values.length).toBeGreaterThan(0)
  await selector.selectOption(values[0])

  await expect(page.getByText(/Match applied to this import|Saved .* as an alias/)).toBeVisible()
  await expect(page.getByRole('checkbox', { name: 'Include Unknown Alias' })).toBeEnabled()
  await expect(page.getByText('Ready', { exact: true })).toBeVisible()
})
""")

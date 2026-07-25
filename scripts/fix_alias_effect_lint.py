from pathlib import Path

p = Path('src/pages/BulkImport.tsx')
s = p.read_text()
old = """  useEffect(() => {
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
"""
new = """  useEffect(() => {
    let active = true
    if (!teamId) return () => { active = false }

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
"""
if old not in s:
    raise SystemExit('Alias loading effect marker not found')
p.write_text(s.replace(old, new, 1))

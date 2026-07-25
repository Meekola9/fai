from pathlib import Path

p = Path('src/store/useStore.tsx')
s = p.read_text()

if "persistQueue.enqueue({ data: next, team })" in s:
    print('Serialized save queue is already applied.')
    raise SystemExit(0)

s = s.replace(
    "} from '../lib/athleteIdentity'\n",
    "} from '../lib/athleteIdentity'\nimport { LatestSaveQueue } from './latestSaveQueue'\n",
    1,
)

s = s.replace(
    "interface AuthUserLike {\n  id: string\n  email?: string | null\n}\n",
    "interface AuthUserLike {\n  id: string\n  email?: string | null\n}\n\ninterface PersistJob {\n  data: Required<AppData>\n  team: ActiveTeam | null\n}\n",
    1,
)

marker = "  const [publicTeamName, setPublicTeamName] = useState<string>()\n"
queue = """  const [persistQueue] = useState(() => new LatestSaveQueue<PersistJob>(
    async (job) => {
      await localStore.save(job.data)
      if (job.team) await saveCloudData(job.team.id, job.data)
    },
    {
      onQueued: () => {
        setSaveStatus('saving')
        setSaveError(undefined)
      },
      onSaved: (job) => {
        if (job.team) setLastSyncedAt(new Date().toISOString())
        setSaveStatus('saved')
        setSaveError(undefined)
      },
      onError: (error, job) => {
        setSaveStatus('error')
        const message = error instanceof Error ? error.message : 'Save failed.'
        setSaveError(job.team
          ? `Saved to this device, but cloud synchronization failed: ${message}`
          : message)
      },
    },
  ))
"""
if marker not in s:
    raise SystemExit('state marker missing')
s = s.replace(marker, marker + queue, 1)

start = s.index('  function persist(next: Required<AppData>) {')
end = s.index('\n  function mutate(', start)
s = s[:start] + """  function persist(next: Required<AppData>) {
    // Keep full-team snapshot writes ordered. An older cloud save must never
    // finish after a newer result and prune that newer row.
    persistQueue.enqueue({ data: next, team })
  }
""" + s[end:]

p.write_text(s)

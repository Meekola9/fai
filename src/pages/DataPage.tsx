import { useRef, useState } from 'react'
import { useStore } from '../store/useStore'
import { Card, Pill, SectionTitle, StatTile } from '../components/ui'
import { exportCsv, downloadCsv } from '../data/csv'
import { isCloudConfigured, TEAM_CODE } from '../store/storage'

export default function DataPage() {
  const { data, resetSample, importCsvText } = useStore()
  const fileRef = useRef<HTMLInputElement>(null)
  const [importMode, setImportMode] = useState<'merge' | 'replace'>('merge')
  const [flash, setFlash] = useState<string | null>(null)

  function notify(msg: string) {
    setFlash(msg)
    setTimeout(() => setFlash(null), 2500)
  }

  function handleExport() {
    const csv = exportCsv(data)
    const stamp = new Date().toISOString().slice(0, 10)
    downloadCsv(`fai-export-${stamp}.csv`, csv)
    notify('Exported CSV')
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      try {
        importCsvText(String(reader.result), importMode)
        notify(`Imported (${importMode})`)
      } catch {
        notify('Import failed — check CSV format')
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  function handleReset() {
    if (confirm('Reset to sample data? This replaces everything currently stored.')) {
      resetSample()
      notify('Sample data restored')
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-black tracking-tight">Data</h1>
        {flash && <Pill tone="up">✓ {flash}</Pill>}
      </div>

      {/* Cloud-sync status */}
      <Card className={`p-4 ${isCloudConfigured ? 'border-up/30' : 'border-flame/30'}`}>
        <div className="flex items-start gap-3">
          <div className="text-2xl">{isCloudConfigured ? '☁️' : '📱'}</div>
          <div>
            {isCloudConfigured ? (
              <>
                <div className="text-sm font-bold text-up">
                  Cloud sync ON — saved to your team database
                </div>
                <div className="mt-0.5 text-xs text-muted">
                  Data is stored in Supabase under team code{' '}
                  <code className="text-fai">{TEAM_CODE}</code> and syncs across
                  every device using this app. Still export a CSV now and then for a backup.
                </div>
              </>
            ) : (
              <>
                <div className="text-sm font-bold text-flame">
                  Local only — this device / browser
                </div>
                <div className="mt-0.5 text-xs text-muted">
                  Data is saved in this browser and is <b>not</b> backed up to the cloud or
                  synced to other devices. Export a CSV regularly to keep a safe copy. To turn on
                  cloud sync, add your Supabase keys (see <code className="text-fai">.env.example</code>).
                </div>
              </>
            )}
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <StatTile label="Athletes" value={data.athletes.length} accent="fai" />
        <StatTile label="Testing Sessions" value={data.sessions.length} accent="gold" />
        <StatTile
          label="Testing Dates"
          value={new Set(data.sessions.map((s) => s.date)).size}
          accent="flame"
        />
      </div>

      <Card className="p-5">
        <SectionTitle>Export</SectionTitle>
        <p className="mb-3 text-sm text-muted">
          Download every athlete and testing session as CSV — one row per session, so no
          historical data is lost.
        </p>
        <button onClick={handleExport} className="rounded-lg bg-fai px-5 py-2 text-sm font-bold text-ink hover:bg-fai/90">
          Export All Data (CSV)
        </button>
      </Card>

      <Card className="p-5">
        <SectionTitle>Import</SectionTitle>
        <p className="mb-3 text-sm text-muted">
          Upload a CSV using the same columns as the export. Choose whether to merge with your
          current data or replace it entirely.
        </p>
        <div className="mb-3 flex gap-2">
          {(['merge', 'replace'] as const).map((m) => (
            <button
              key={m}
              onClick={() => setImportMode(m)}
              className={`rounded-lg px-3 py-1.5 text-sm font-bold capitalize transition ${
                importMode === m ? 'bg-fai text-ink' : 'bg-panel-2 text-muted hover:text-chalk'
              }`}
            >
              {m}
            </button>
          ))}
        </div>
        <input ref={fileRef} type="file" accept=".csv,text/csv" onChange={handleFile} className="hidden" />
        <button
          onClick={() => fileRef.current?.click()}
          className="rounded-lg border border-line px-5 py-2 text-sm font-bold text-chalk hover:bg-panel-2"
        >
          Choose CSV File…
        </button>
      </Card>

      <Card className="border-flame/20 p-5">
        <SectionTitle>Reset</SectionTitle>
        <p className="mb-3 text-sm text-muted">
          Restore the built-in sample roster and multi-period testing data. Useful for demos or
          starting fresh.
        </p>
        <button
          onClick={handleReset}
          className="rounded-lg border border-flame/40 px-5 py-2 text-sm font-bold text-flame hover:bg-flame/10"
        >
          Reset Sample Data
        </button>
      </Card>

      <div className="text-center text-xs text-muted">
        All data is stored in your browser (localStorage). The storage layer in{' '}
        <code className="text-fai">src/store/storage.ts</code> is a drop-in interface for Supabase or
        Firebase later.
      </div>
    </div>
  )
}

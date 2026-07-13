import { useRef, useState } from 'react'
import { useStore } from '../store/useStore'
import { Card, Pill, SectionTitle, StatTile } from '../components/ui'
import CloudPanel from '../components/CloudPanel'
import { exportCsv, importCsv, downloadCsv } from '../data/csv'
import type { AppData } from '../types'

interface PendingImport {
  text: string
  filename: string
  parsed: Required<AppData>
}

export default function DataPage() {
  const { data, resetSample, importCsvText, saveStatus, saveError } = useStore()
  const fileRef = useRef<HTMLInputElement>(null)
  const [importMode, setImportMode] = useState<'merge' | 'replace'>('merge')
  const [flash, setFlash] = useState<string | null>(null)
  const [pending, setPending] = useState<PendingImport | null>(null)
  const [importError, setImportError] = useState<string | null>(null)

  function notify(message: string) {
    setFlash(message)
    setTimeout(() => setFlash(null), 2500)
  }

  function exportBackup(prefix = 'fai-export') {
    const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
    downloadCsv(`${prefix}-${stamp}.csv`, exportCsv(data))
  }

  function handleFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const text = String(reader.result)
        const parsed = importCsv(text) as Required<AppData>
        setPending({ text, filename: file.name, parsed })
        setImportError(null)
      } catch (error: unknown) {
        setPending(null)
        setImportError(error instanceof Error ? error.message : 'Import failed — check CSV format.')
      }
    }
    reader.onerror = () => setImportError('Could not read the selected file.')
    reader.readAsText(file)
    event.target.value = ''
  }

  function confirmImport() {
    if (!pending) return
    try {
      if (importMode === 'replace') exportBackup('fai-pre-replace-backup')
      importCsvText(pending.text, importMode)
      notify(`Imported ${pending.filename} (${importMode})`)
      setPending(null)
      setImportError(null)
    } catch (error: unknown) {
      setImportError(error instanceof Error ? error.message : 'Import failed.')
    }
  }

  function handleReset() {
    if (!confirm('Reset to the bundled historical baseline? A backup will download first.')) return
    exportBackup('fai-pre-reset-backup')
    resetSample()
    notify('Historical baseline restored')
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-black tracking-tight">Data</h1>
        <div className="flex items-center gap-2">
          {flash && <Pill tone="up">✓ {flash}</Pill>}
          {saveStatus === 'saving' && <Pill>Saving on device…</Pill>}
          {saveStatus === 'saved' && <Pill tone="up">Device copy saved</Pill>}
          {saveStatus === 'error' && <Pill tone="down">Device save failed</Pill>}
        </div>
      </div>

      {(saveError || importError) && (
        <Card className="border-down/40 bg-down/5 p-4 text-sm text-down">
          {saveError || importError}
        </Card>
      )}

      <CloudPanel />

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatTile label="Athletes" value={data.athletes.length} accent="fai" />
        <StatTile label="Testing Events" value={data.events.length} accent="up" />
        <StatTile label="Entries" value={data.sessions.length} accent="gold" />
        <StatTile label="Testing Dates" value={new Set(data.sessions.map((session) => session.date)).size} accent="flame" />
      </div>

      <Card className="p-5">
        <SectionTitle>Export Complete Backup</SectionTitle>
        <p className="mb-3 text-sm text-muted">
          The export contains roster-only athletes, testing events, historical profile snapshots, and every entry. Keep periodic exports even when cloud sync is active.
        </p>
        <button type="button" onClick={() => exportBackup()} className="rounded-lg bg-fai px-5 py-2 text-sm font-bold text-ink hover:bg-fai/90">
          Export All Data (CSV)
        </button>
      </Card>

      <Card className="p-5">
        <SectionTitle>Import With Preview</SectionTitle>
        <p className="mb-3 text-sm text-muted">
          Files are validated before any data changes. Replace mode automatically downloads a backup first and synchronizes the replacement when connected to an editable cloud team.
        </p>
        <div className="mb-3 flex gap-2">
          {(['merge', 'replace'] as const).map((mode) => (
            <button
              type="button"
              key={mode}
              onClick={() => setImportMode(mode)}
              className={`rounded-lg px-3 py-1.5 text-sm font-bold capitalize transition ${importMode === mode ? 'bg-fai text-ink' : 'bg-panel-2 text-muted hover:text-chalk'}`}
            >
              {mode}
            </button>
          ))}
        </div>
        <input ref={fileRef} type="file" accept=".csv,text/csv" onChange={handleFile} className="hidden" />
        <button type="button" onClick={() => fileRef.current?.click()} className="rounded-lg border border-line px-5 py-2 text-sm font-bold text-chalk hover:bg-panel-2">
          Choose CSV File…
        </button>

        {pending && (
          <div className="mt-4 rounded-xl border border-fai/30 bg-fai/5 p-4">
            <div className="font-bold text-chalk">Import preview: {pending.filename}</div>
            <div className="mt-2 grid grid-cols-3 gap-3 text-center">
              <div><div className="text-2xl font-black text-fai">{pending.parsed.athletes.length}</div><div className="text-xs text-muted">athletes</div></div>
              <div><div className="text-2xl font-black text-fai">{pending.parsed.events.length}</div><div className="text-xs text-muted">events</div></div>
              <div><div className="text-2xl font-black text-fai">{pending.parsed.sessions.length}</div><div className="text-xs text-muted">entries</div></div>
            </div>
            <div className="mt-4 flex gap-2">
              <button type="button" onClick={confirmImport} className="rounded-lg bg-fai px-4 py-2 text-sm font-bold text-ink">
                Confirm {importMode}
              </button>
              <button type="button" onClick={() => setPending(null)} className="rounded-lg border border-line px-4 py-2 text-sm font-bold text-muted">
                Cancel
              </button>
            </div>
          </div>
        )}
      </Card>

      <Card className="border-flame/20 p-5">
        <SectionTitle>Reset</SectionTitle>
        <p className="mb-3 text-sm text-muted">
          Restore the bundled 2020–2025 historical baseline. A complete backup downloads before the reset.
        </p>
        <button type="button" onClick={handleReset} className="rounded-lg border border-flame/40 px-5 py-2 text-sm font-bold text-flame hover:bg-flame/10">
          Reset Historical Baseline
        </button>
      </Card>
    </div>
  )
}

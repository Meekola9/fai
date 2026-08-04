import { useMemo, useState } from 'react'
import { Card } from './ui'
import type { FilmCatalogEntry, FilmCatalogKind } from '../types'

interface Props {
  catalog: readonly FilmCatalogEntry[]
  onAdd: (entry: Omit<FilmCatalogEntry, 'id' | 'createdAt'>) => void
  onRemove: (id: string) => void
}

const KIND_LABEL: Record<FilmCatalogKind, string> = {
  formation: 'Formation',
  personnel: 'Personnel',
  run_concept: 'Run concept',
  pass_concept: 'Pass concept',
}

const KIND_ORDER: FilmCatalogKind[] = ['formation', 'personnel', 'run_concept', 'pass_concept']

/** label → stable slug used as the play tag key. */
function slugify(label: string): string {
  return label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
}

/**
 * Coach-facing manager for custom formations / personnel / concepts. These
 * extend the built-in tagging vocabulary — the place to encode a look scouted
 * from film so it becomes a reusable tag and shows up in the scouting report.
 */
export function FilmCatalogManager({ catalog, onAdd, onRemove }: Props) {
  const [open, setOpen] = useState(false)
  const [kind, setKind] = useState<FilmCatalogKind>('formation')
  const [label, setLabel] = useState('')
  const [note, setNote] = useState('')

  const grouped = useMemo(() => {
    const map = new Map<FilmCatalogKind, FilmCatalogEntry[]>()
    for (const entry of catalog) {
      map.set(entry.kind, [...(map.get(entry.kind) ?? []), entry])
    }
    return map
  }, [catalog])

  function add() {
    const trimmed = label.trim()
    const key = slugify(trimmed)
    if (!trimmed || !key) return
    onAdd({ kind, key, label: trimmed, note: note.trim() || undefined })
    setLabel('')
    setNote('')
  }

  return (
    <Card className="p-4">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center justify-between gap-3 text-left"
      >
        <div>
          <div className="text-sm font-black text-chalk">Formation &amp; concept library</div>
          <div className="text-xs text-muted">
            Add your own looks — including opponent formations from film — to the tagging menus and scouting report.
          </div>
        </div>
        <span className="shrink-0 text-muted">{open ? '▴' : '▾'}</span>
      </button>

      {open && (
        <div className="mt-3 space-y-3">
          <div className="flex flex-wrap items-end gap-2">
            <select
              value={kind}
              onChange={(event) => setKind(event.target.value as FilmCatalogKind)}
              className="rounded-lg border border-line bg-panel px-3 py-2 text-sm text-chalk outline-none focus:border-fai"
            >
              {KIND_ORDER.map((value) => (
                <option key={value} value={value}>{KIND_LABEL[value]}</option>
              ))}
            </select>
            <input
              value={label}
              onChange={(event) => setLabel(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault()
                  add()
                }
              }}
              placeholder="Name (e.g. Trips Open, Diamond)"
              className="min-w-0 flex-1 rounded-lg border border-line bg-panel px-3 py-2 text-sm text-chalk placeholder:text-muted/60 outline-none focus:border-fai"
            />
            <input
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="Recognition cue (optional)"
              className="min-w-0 flex-1 rounded-lg border border-line bg-panel px-3 py-2 text-sm text-chalk placeholder:text-muted/60 outline-none focus:border-fai"
            />
            <button
              type="button"
              onClick={add}
              disabled={!label.trim()}
              className="rounded-lg bg-fai px-4 py-2 text-sm font-bold text-ink disabled:opacity-40"
            >
              Add
            </button>
          </div>

          {KIND_ORDER.filter((value) => (grouped.get(value)?.length ?? 0) > 0).map((value) => (
            <div key={value}>
              <div className="text-[10px] font-black uppercase tracking-wider text-muted">{KIND_LABEL[value]}</div>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {(grouped.get(value) ?? []).map((entry) => (
                  <span
                    key={entry.id}
                    title={entry.note}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-panel-2/50 px-2 py-1 text-xs font-bold text-chalk"
                  >
                    {entry.label}
                    <button
                      type="button"
                      onClick={() => onRemove(entry.id)}
                      aria-label={`Remove ${entry.label}`}
                      className="text-muted hover:text-down"
                    >
                      ✕
                    </button>
                  </span>
                ))}
              </div>
            </div>
          ))}

          {catalog.length === 0 && (
            <p className="text-xs text-muted">
              No custom entries yet. Anything you add here joins the built-in formations and concepts everywhere film is tagged.
            </p>
          )}
        </div>
      )}
    </Card>
  )
}

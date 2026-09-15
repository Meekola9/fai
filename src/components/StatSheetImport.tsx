import { useEffect, useState } from 'react'
import type { StatKey } from '../types'
import type { HudlTable } from '../lib/hudlImport'
import { STAT_LABEL } from '../lib/playerStats'
import { parseStatSheet, statKeyForHeader, type StatSection } from '../lib/statSheetImport'

const control = 'mt-1 w-full min-w-0 rounded-lg border border-line bg-panel p-2 text-sm'
export default function StatSheetImport({ playerName, onApply }: { playerName: string; onApply: (values: Partial<Record<StatKey, string>>) => void }) {
  const [text, setText] = useState('')
  const [section, setSection] = useState<StatSection>('defense')
  const [table, setTable] = useState<HudlTable>()
  const [row, setRow] = useState(0)
  const [mapping, setMapping] = useState<Record<string, StatKey | ''>>({})
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [preview, setPreview] = useState('')
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview) }, [preview])
  function review(parsed: HudlTable) {
    if (!parsed.rows.length || !parsed.headers.length) throw new Error('No stat rows found. Use a CSV with headers, or one label and number per line, such as “Missed tackles 2”.')
    setTable(parsed); setRow(0)
    setMapping(Object.fromEntries(parsed.headers.map(header => [header, statKeyForHeader(header, section) ?? ''])))
    setMessage('Check the row, player, and every mapped number. Nothing has been saved.')
  }
  async function load(file?: File) {
    if (!file) return
    setTable(undefined); setPreview(''); setBusy(true); setMessage('Reading file…')
    try {
      if (file.size > 15 * 1024 * 1024) throw new Error('Choose a file smaller than 15 MB.')
      if (/\.(xlsx|xlsm)$/i.test(file.name)) {
        const { parseHudlWorkbookFile } = await import('../lib/hudlWorkbook')
        const workbook = await parseHudlWorkbookFile(file)
        review(workbook.table)
        setMessage(`Worksheet: ${workbook.sheetName}. Review the selected player and game; export the desired worksheet as CSV if this is the wrong sheet.`)
      } else if (file.type.startsWith('image/')) {
        setPreview(URL.createObjectURL(file))
        const { createWorker } = await import('tesseract.js')
        const ocrRoot = new URL(`${import.meta.env.BASE_URL}ocr/`, window.location.origin).href
        const worker = await createWorker('eng', 1, { workerPath: `${ocrRoot}worker.min.js`, corePath: `${ocrRoot}tesseract-core-lstm.wasm.js`, langPath: ocrRoot, logger: progress => setMessage(`${progress.status} ${Math.round((progress.progress ?? 0) * 100)}%`) })
        try {
          const result = await worker.recognize(file)
          setText(result.data.text)
          setMessage('Screenshot text extracted. Check the text, then choose Review numbers. Crop to one player’s single-game stats for best results.')
        } finally { await worker.terminate() }
      } else if (/\.(csv|tsv|txt)$/i.test(file.name)) {
        const content = await file.text(); setText(content); review(parseStatSheet(content, section))
      } else throw new Error('Use CSV, TSV, XLSX, or a PNG/JPG screenshot. Resave legacy XLS files as XLSX.')
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Could not read the file. Try CSV or manual entry.'); }
    finally { setBusy(false) }
  }
  function apply() {
    if (!table) return
    const values: Partial<Record<StatKey, string>> = {}
    for (const header of table.headers) {
      const key = mapping[header]
      if (!key) continue
      if (values[key] !== undefined) { setMessage(`Two columns map to ${STAT_LABEL[key].label}. Choose only one.`); return }
      const value = table.rows[row][header]?.trim()
      if (!value) continue
      if (!/^-?\d+(?:\.\d+)?$/.test(value)) { setMessage(`Check “${header}”: “${value}” is not a clear number. Correct the text or ignore this column.`); return }
      values[key] = value
    }
    if (!Object.keys(values).length) { setMessage('Map at least one stat column.'); return }
    onApply(values); setMessage(`Numbers copied to ${playerName}’s game form below. Confirm date, opponent, and stats, then Save game.`)
  }
  return <details className="mt-3 rounded-xl border border-line p-3"><summary className="cursor-pointer text-sm font-black text-fai">Upload Hudl stats or a screenshot</summary>
    <p className="mt-2 text-xs text-muted">Import one player’s single-game box score. Hudl CSV/Excel exports and clear screenshots are supported. Play-by-play exports and season totals need to be converted to a single-game stat line first. Screenshots are read on this device; the first use downloads the reader.</p>
    <label className="mt-3 block text-sm">Stats section<select aria-label="Stats section" value={section} className={control} onChange={e => { const next = e.target.value as StatSection; setSection(next); if (table) setMapping(Object.fromEntries(table.headers.map(h => [h, statKeyForHeader(h, next) ?? '']))) }}><option value="defense">Defense</option><option value="passing">Passing</option><option value="rushing">Rushing</option><option value="receiving">Receiving</option></select></label>
    <label className="mt-3 block text-sm">Stat file or screenshot<input disabled={busy} type="file" accept=".csv,.tsv,.txt,.xlsx,.xlsm,image/png,image/jpeg,image/webp" className={control} onChange={e => { void load(e.target.files?.[0]); e.target.value = '' }} /></label>
    {preview && <img src={preview} alt="Uploaded stat sheet for checking extracted numbers" className="mt-3 max-h-80 w-full rounded-lg object-contain" />}
    <label className="mt-3 block text-sm">Paste stats or correct extracted text<textarea disabled={busy} className={control} rows={4} value={text} placeholder={'Tackles 8\nMissed tackles 2\nSacks 1'} onChange={e => { setText(e.target.value); setTable(undefined) }} /></label>
    <button type="button" disabled={busy || !text.trim()} className="mt-2 rounded-lg border border-line px-3 py-2 text-sm font-bold disabled:opacity-40" onClick={() => { try { review(parseStatSheet(text, section)) } catch (error) { setMessage(String(error)) } }}>Review numbers</button>
    {table && <div className="mt-3 space-y-3"><label className="block text-sm font-bold">Row to use for {playerName}<select className={control} value={row} onChange={e => setRow(Number(e.target.value))}>{table.rows.map((entry, i) => <option key={i} value={i}>Row {i + 1}: {Object.values(entry).join(' · ').slice(0, 160)}</option>)}</select></label><div className="grid gap-2 sm:grid-cols-2">{table.headers.map(header => <label key={header} className="min-w-0 text-xs"><span className="break-words">{header}: <strong>{table.rows[row][header] || '(blank)'}</strong></span><select aria-label={`Map ${header}`} className={control} value={mapping[header] ?? ''} onChange={e => setMapping(previous => ({ ...previous, [header]: e.target.value as StatKey | '' }))}><option value="">Ignore column</option>{Object.entries(STAT_LABEL).map(([key, label]) => <option key={key} value={key}>{label.label}</option>)}</select></label>)}</div><button type="button" onClick={apply} className="rounded-lg border border-fai px-3 py-2 text-sm font-black text-fai">Use reviewed numbers</button></div>}
    <p role="status" className="mt-2 text-sm text-muted">{message}</p>
  </details>
}

import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useStore } from '../store/useStore'
import { useAccountAccess } from '../hooks/useAccountAccess'
import { loadWeeklyGrades, saveWeeklyGrade } from '../store/weeklyReports'
import { countPercent, defaultCriteria, gradePercent, REPORT_GROUPS, sameReportGame, weeklyGradesCsv, weeklyPacketHtml, weeklySituations, type WeeklyGrade } from '../lib/weeklyReports'
import type { PositionGroup } from '../types'

const control = 'w-full rounded-xl border border-line bg-ink px-3 py-3 text-chalk'
const button = 'rounded-xl border border-line px-4 py-3 text-sm font-bold text-chalk disabled:opacity-40'
function download(name: string, text: string, type: string) {
  const url = URL.createObjectURL(new Blob([text], { type }))
  const link = document.createElement('a')
  link.href = url; link.download = name; link.click()
  window.setTimeout(() => URL.revokeObjectURL(url), 60000)
}
export default function WeeklyReports() {
  const { teamId, viewerMode, userEmail } = useStore()
  const access = useAccountAccess()
  if (viewerMode || !access.capabilities.canViewReports) return <p>Staff access is required to open weekly reports.</p>
  return <ReportWorkspace key={(teamId ?? 'local') + (userEmail ?? '')} />
}
function ReportWorkspace() {
  const { data, teamId, teamName } = useStore()
  const [cards, setCards] = useState<WeeklyGrade[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [date, setDate] = useState('')
  const [opponent, setOpponent] = useState('')
  const [group, setGroup] = useState<PositionGroup>('RB')
  const [athleteId, setAthleteId] = useState('')
  const [draft, setDraft] = useState<WeeklyGrade | null>(null)
  const [dirty, setDirty] = useState(false)
  const [sourceId, setSourceId] = useState('')
  const [retry, setRetry] = useState(0)
  useEffect(() => {
    let active = true
    loadWeeklyGrades(teamId).then(rows => {
      if (active) { setCards(rows); setLoadError(''); setLoading(false) }
    }).catch((error: unknown) => {
      if (active) { setLoadError(error instanceof Error ? error.message : 'Could not load reports.'); setLoading(false) }
    })
    return () => { active = false }
  }, [teamId, retry])
  useEffect(() => {
    if (!dirty) return
    const handler = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = '' }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [dirty])
  const gameCards = cards.filter(card => sameReportGame(card, date, opponent))
  const roster = data.athletes.filter(a => a.positionGroup === group || a.secondaryPositionGroup === group).sort((a, b) => a.name.localeCompare(b.name))
  const selectedSource = data.filmSources.find(s => s.id === sourceId)
  const sourcePlays = sourceId ? data.filmPlays.filter(p => p.filmSourceId === sourceId) : []
  const situations = sourceId ? weeklySituations(sourcePlays) : []
  const sourceLabel = selectedSource?.label ?? ''
  const disabled = loading || busy || Boolean(loadError)
  function edit(change: Partial<WeeklyGrade>) {
    setDraft(current => current ? { ...current, ...change } : current)
    setDirty(true); setMessage('')
  }
  function openGrade(card?: WeeklyGrade) {
    const athlete = data.athletes.find(a => a.id === athleteId)
    if (!card && (!athlete || !date || !opponent.trim())) { setMessage('Choose a date, opponent, and athlete first.'); return }
    if (dirty && !window.confirm('Discard the unsaved evaluation changes?')) return
    const existing = card ?? gameCards.find(c => c.athleteId === athleteId && c.positionGroup === group)
    setDraft(existing ? structuredClone(existing) : {
      id: crypto.randomUUID(), athleteId: athlete!.id, athleteName: athlete!.name, positionGroup: group,
      date, opponent: opponent.trim(), coach: '', criteria: defaultCriteria(group), notes: '', focus: '', revision: 0,
    })
    setDirty(false); setMessage('')
  }
  async function save() {
    if (!draft || busy) return
    setBusy(true); setMessage('')
    try {
      const saved = await saveWeeklyGrade(draft, teamId)
      setCards(current => [...current.filter(c => c.id !== saved.id), saved])
      setDraft(saved); setDirty(false); setMessage('Evaluation saved.')
    } catch (error: unknown) { setMessage(error instanceof Error ? error.message : 'Could not save. Your draft is still open.') }
    finally { setBusy(false) }
  }
  function exportPacket(single?: WeeklyGrade) {
    const chosen = single ? [single] : gameCards
    const reportDate = single?.date ?? date
    const reportOpponent = single?.opponent ?? opponent
    download('fai-weekly-report-' + (reportDate || 'scouting') + '.html', weeklyPacketHtml(teamName ?? 'FAI Team', reportDate, reportOpponent, chosen, single ? [] : situations, sourceLabel), 'text/html;charset=utf-8')
    setMessage('Report downloaded. Open it and choose Print / Save as PDF. Only saved evaluations are included.')
  }
  return <div className="space-y-6">
    <header className="rounded-2xl border border-fai/30 bg-panel p-5 sm:p-8">
      <p className="text-xs font-black uppercase tracking-widest text-fai">FAI · Coach workspace</p>
      <h1 className="mt-2 text-3xl font-black text-chalk">Weekly Reports</h1>
      <p className="mt-2 max-w-2xl text-sm text-muted">Grade execution. Set the next practice focus. Build a packet your staff and players can use.</p>
      <div className="mt-4 flex flex-wrap gap-3">
        <Link className={button} to="/import">Import roster</Link>
        <Link className={button} to="/film">Import / tag game film</Link>
        <span className="self-center text-xs text-muted">{teamId ? 'Private staff reports · cloud storage' : 'On-device reports · export a backup regularly'}</span>
      </div>
    </header>
    {loadError && <div role="alert" className="rounded-xl border border-down p-4 text-down">{loadError}<p className="mt-2">Reports cannot be saved until storage is available.</p><button className={button} onClick={() => { setLoading(true); setRetry(n => n + 1) }}>Retry loading</button></div>}
    {message && <p role="status" className="rounded-xl border border-fai/30 bg-panel p-4 text-sm text-chalk">{message}</p>}
    <section className="rounded-2xl border border-line bg-panel p-5">
      <h2 className="text-lg font-black text-chalk">1. Choose the game</h2>
      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        <label className="text-sm text-muted">Game date<input aria-label="Game date" type="date" value={date} disabled={Boolean(draft)} onChange={e => setDate(e.target.value)} className={control} /></label>
        <label className="text-sm text-muted">Opponent<input aria-label="Opponent" value={opponent} disabled={Boolean(draft)} onChange={e => setOpponent(e.target.value)} placeholder="Opponent name" className={control} /></label>
        <label className="text-sm text-muted">Saved games<select aria-label="Saved games" className={control} value="" disabled={Boolean(draft)} onChange={e => { const c = cards.find(c => c.id === e.target.value); if (c) { setDate(c.date); setOpponent(c.opponent) } }}><option value="">Choose a saved game</option>{cards.filter((c, i) => cards.findIndex(other => sameReportGame(other, c.date, c.opponent)) === i).map(c => <option key={c.id} value={c.id}>{c.date} · {c.opponent}</option>)}</select></label>
      </div>
      <p className="mt-3 text-xs text-muted">{loading ? 'Loading saved evaluations…' : gameCards.length + ' saved evaluations for this game.'} Close the current evaluation to change games.</p>
    </section>
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
      <section className="min-w-0 rounded-2xl border border-line bg-panel p-5">
        <h2 className="text-lg font-black text-chalk">2. Position grading</h2>
        <div className="mt-4 grid gap-3">
          <label className="text-sm text-muted">Position group<select aria-label="Position group" className={control} value={group} disabled={busy} onChange={e => { setGroup(e.target.value as PositionGroup); setAthleteId('') }}>{REPORT_GROUPS.map(g => <option key={g}>{g}</option>)}</select></label>
          <label className="text-sm text-muted">Athlete<select aria-label="Athlete" className={control} value={athleteId} disabled={busy} onChange={e => setAthleteId(e.target.value)}><option value="">Select athlete</option>{roster.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}</select></label>
          {!roster.length && <p className="text-sm text-muted">No athletes in this position group. Import a roster or update a player's position.</p>}
          <button className="rounded-xl bg-fai px-4 py-3 font-black text-ink disabled:opacity-40" disabled={disabled || !date || !opponent.trim() || !athleteId} onClick={() => openGrade()}>Open evaluation</button>
        </div>
        <h3 className="mt-6 font-bold text-chalk">Saved evaluations</h3>
        <div className="mt-3 space-y-2">{gameCards.map(c => <div key={c.id} className="rounded-xl border border-line p-3">
          <div className="flex justify-between gap-2"><button className="text-left font-bold text-chalk underline" disabled={disabled} onClick={() => openGrade(c)}>{c.athleteName}</button><span className="font-black text-fai">{gradePercent(c.criteria)}%</span></div>
          <p className="text-xs text-muted">{c.positionGroup} · {c.coach}</p>
          <button className="mt-2 text-xs font-bold text-fai underline" onClick={() => exportPacket(c)}>Download player report</button>
        </div>)}</div>
      </section>
      <section className="min-w-0 rounded-2xl border border-line bg-panel p-5">
        {!draft ? <div className="py-10 text-center"><p className="text-xl font-black text-chalk">Every grade needs a next step.</p><p className="mt-3 text-sm text-muted">Open an athlete to enter execution grades and clear feedback.</p></div> : <fieldset disabled={busy} className="space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-2"><div><h2 className="text-xl font-black text-chalk">{draft.athleteName}</h2><p className="text-sm text-muted">{draft.positionGroup} · {draft.date} vs {draft.opponent}</p></div><span className="text-3xl font-black text-fai">{gradePercent(draft.criteria) === null ? '—' : gradePercent(draft.criteria) + '%'}</span></div>
          <p className="text-xs text-muted">0 missed · 1 inconsistent · 2 executed · N/A excluded. All graded criteria carry equal weight. Edit labels to match your staff's standards.</p>
          <label className="block text-sm text-muted">Grading coach<input aria-label="Grading coach" className={control} value={draft.coach} onChange={e => edit({ coach: e.target.value })} /></label>
          {draft.criteria.map((criterion, index) => <div key={index} className="grid grid-cols-[minmax(0,1fr)_100px_40px] items-center gap-2">
            <input aria-label={'Criterion ' + (index + 1)} className={control} value={criterion.label} onChange={e => edit({ criteria: draft.criteria.map((c, i) => i === index ? { ...c, label: e.target.value } : c) })} />
            <select aria-label={'Score for criterion ' + (index + 1)} className={control} value={criterion.score ?? ''} onChange={e => edit({ criteria: draft.criteria.map((c, i) => i === index ? { ...c, score: e.target.value === '' ? null : Number(e.target.value) } : c) })}><option value="">N/A</option><option value="0">0</option><option value="1">1</option><option value="2">2</option></select>
            <button aria-label={'Remove criterion ' + (index + 1)} disabled={draft.criteria.length <= 1} className="p-3 text-muted" onClick={() => edit({ criteria: draft.criteria.filter((_, i) => i !== index) })}>×</button>
          </div>)}
          <button className={button} disabled={draft.criteria.length >= 12} onClick={() => edit({ criteria: [...draft.criteria, { label: '', score: null }] })}>Add criterion</button>
          <label className="block text-sm text-muted">Player feedback<textarea aria-label="Player feedback" className={control} rows={3} value={draft.notes} onChange={e => edit({ notes: e.target.value })} placeholder="What did the player execute? What needs correction?" /></label>
          <label className="block text-sm text-muted">Next practice focus<textarea aria-label="Next practice focus" className={control} rows={2} value={draft.focus} onChange={e => edit({ focus: e.target.value })} placeholder="One concrete skill, drill, or assignment to improve." /></label>
          <div className="flex flex-wrap items-center gap-3"><button className="rounded-xl bg-fai px-5 py-3 font-black text-ink" disabled={disabled} onClick={() => void save()}>{busy ? 'Saving…' : 'Save evaluation'}</button><button className={button} onClick={() => { if (!dirty || window.confirm('Discard the unsaved evaluation changes?')) { setDraft(null); setDirty(false) } }}>Close evaluation</button><span className="text-xs text-muted">{dirty ? 'Unsaved changes' : draft.revision ? 'Saved' : 'New evaluation'}</span></div>
        </fieldset>}
      </section>
    </div>
    <section className="rounded-2xl border border-line bg-panel p-5">
      <h2 className="text-lg font-black text-chalk">3. Situational scouting</h2>
      <p className="mt-2 text-sm text-muted">Select the source film that charts the offense you are scouting. Source film is independent of the player grading game above.</p>
      <label className="mt-4 block max-w-xl text-sm text-muted">Scouting film source<select aria-label="Scouting film source" className={control} value={sourceId} onChange={e => setSourceId(e.target.value)}><option value="">No scouting sheet</option>{data.filmSources.map(s => <option key={s.id} value={s.id}>{s.label}{s.date ? ' · ' + s.date : ''}</option>)}</select></label>
      <p className="mt-3 text-xs text-muted">Import or tag plays in Film Room and attach them to a source. Pass includes screens. RPO and unknown are separate. Field position is measured from the scouted offense's goal line.</p>
      {sourceId && <div className="mt-4 overflow-x-auto"><table className="w-full text-left text-sm"><thead className="text-muted"><tr>{['Situation', 'Snaps', 'Run', 'Pass', 'RPO', 'Unknown', 'Top concept'].map(h => <th key={h} className="p-3">{h}</th>)}</tr></thead><tbody>{situations.map(s => <tr key={s.label} className="border-t border-line text-chalk"><td className="p-3">{s.label}{s.count > 0 && s.count < 10 && <span className="block text-xs text-flame">Small sample</span>}</td><td className="p-3">{s.count}</td>{[s.run, s.pass, s.rpo, s.unknown].map((n, i) => <td key={i} className="whitespace-nowrap p-3">{countPercent(n, s.count)}</td>)}<td className="p-3">{s.topConcept}</td></tr>)}</tbody></table></div>}
    </section>
    <section className="rounded-2xl border border-fai/30 bg-panel p-5">
      <h2 className="text-lg font-black text-chalk">4. Download the weekly packet</h2>
      <p className="mt-2 text-sm text-muted">Position summaries, individual player pages, and the selected scouting sheet. The printable file opens in your browser; use Print / Save as PDF.</p>
      <div className="mt-4 flex flex-wrap gap-3"><button className="rounded-xl bg-fai px-5 py-3 font-black text-ink disabled:opacity-40" disabled={disabled || (!gameCards.length && !sourceId)} onClick={() => exportPacket()}>Download printable packet</button><button className={button} disabled={disabled || !gameCards.length} onClick={() => download('fai-grades-' + date + '.csv', weeklyGradesCsv(gameCards), 'text/csv;charset=utf-8')}>Export grades CSV</button></div>
      {dirty && <p className="mt-3 text-sm text-flame">Save your open evaluation before exporting to include the latest changes.</p>}
    </section>
  </div>
}

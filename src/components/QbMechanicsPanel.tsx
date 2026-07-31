import { useMemo, useState } from 'react'
import { useStore } from '../store/useStore'
import type { FilmPlay, ThrowAnalysis } from '../types'
import {
  buildQbMechanicsReport,
  compareQbMechanics,
  type QbMechanicsCategory,
  type QbMechanicsSeverity,
} from '../lib/qbMechanics'
import { qbMechanicsReportHtml } from '../lib/qbMechanicsExport'
import { throwAnalysisAnnotation } from '../lib/throwAnalysis'

const CATEGORY_LABEL: Record<QbMechanicsCategory, string> = {
  timing: 'Timing',
  'upper-body': 'Upper body',
  separation: 'Separation',
  base: 'Base',
  stride: 'Stride',
  release: 'Release',
}

const SEVERITY_STYLE: Record<QbMechanicsSeverity, string> = {
  strength: 'border-up/35 bg-up/5 text-up',
  watch: 'border-gold/35 bg-gold/5 text-gold',
  priority: 'border-down/35 bg-down/5 text-down',
}

interface SavedThrow {
  play: FilmPlay
  analysis: ThrowAnalysis
  label: string
}

function savedThrowLabel(play: FilmPlay, quarterbackName?: string): string {
  return [
    play.date,
    play.opponent ? `vs ${play.opponent}` : undefined,
    quarterbackName,
    play.filmLabel,
  ].filter(Boolean).join(' · ') || 'Saved throw'
}

function formatFindingValue(value?: number, unit?: string): string {
  if (typeof value !== 'number' || !Number.isFinite(value)) return '—'
  const digits = unit === 's' ? 2 : unit === '% frame' ? 1 : 0
  return `${value.toFixed(digits)}${unit ?? ''}`
}

function categoryList(categories: QbMechanicsCategory[]): string {
  return categories.length > 0
    ? categories.map((category) => CATEGORY_LABEL[category]).join(', ')
    : 'None'
}

export default function QbMechanicsPanel({
  analysis,
  currentPlayId,
  filmLabel,
  opponent,
  date,
}: {
  analysis: ThrowAnalysis
  currentPlayId?: string | null
  filmLabel?: string
  opponent?: string
  date?: string
}) {
  const { data } = useStore()
  const [baselinePlayId, setBaselinePlayId] = useState('')
  const [printMessage, setPrintMessage] = useState<string>()
  const report = useMemo(() => buildQbMechanicsReport(analysis), [analysis])
  const quarterback = data.athletes.find((athlete) => athlete.id === analysis.quarterbackId)

  const savedThrows = useMemo<SavedThrow[]>(() => data.filmPlays.flatMap((play) => {
    if (play.id === currentPlayId) return []
    const saved = throwAnalysisAnnotation(play.annotations ?? [])?.throwAnalysis
    if (!saved) return []
    if (analysis.quarterbackId && saved.quarterbackId && saved.quarterbackId !== analysis.quarterbackId) return []
    const savedQuarterback = data.athletes.find((athlete) => athlete.id === saved.quarterbackId)
    return [{
      play,
      analysis: saved,
      label: savedThrowLabel(play, savedQuarterback?.name),
    }]
  }).sort((a, b) => `${b.play.date ?? ''}${b.play.createdAt ?? ''}`.localeCompare(`${a.play.date ?? ''}${a.play.createdAt ?? ''}`)), [analysis.quarterbackId, currentPlayId, data.athletes, data.filmPlays])

  const baseline = savedThrows.find((item) => item.play.id === baselinePlayId)
  const comparison = baseline ? compareQbMechanics(baseline.analysis, analysis) : undefined

  function printReport() {
    const html = qbMechanicsReportHtml({
      analysis,
      quarterbackName: quarterback?.name,
      filmLabel,
      opponent,
      date,
      comparison: baseline && comparison ? {
        label: baseline.label,
        scoreDelta: comparison.scoreDelta,
        improved: comparison.improved,
        regressed: comparison.regressed,
      } : undefined,
    })
    const win = window.open('', '_blank')
    if (!win) {
      setPrintMessage('The browser blocked the report window. Allow pop-ups, then print again.')
      return
    }
    win.document.write(html)
    win.document.close()
    setPrintMessage('Printable mechanics report opened in a new tab.')
  }

  return (
    <section className="space-y-3 rounded-xl border border-fai/30 bg-panel-2/50 p-3" aria-label="Quarterback mechanics grade">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-sm font-black text-chalk">Quarterback mechanics grade</div>
          <div className="mt-1 max-w-3xl text-[11px] leading-relaxed text-muted">
            Grades only the timing markers and 2D release-frame landmarks currently available. Missing measurements stay ungraded.
          </div>
        </div>
        <button
          type="button"
          onClick={printReport}
          disabled={report.findings.length === 0}
          className="rounded-lg border border-fai/40 bg-fai/10 px-3 py-2 text-xs font-black text-fai disabled:opacity-40"
        >
          Print mechanics report
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:max-w-md">
        <div className="rounded-lg border border-line bg-panel p-3">
          <div className="text-[9px] font-bold uppercase tracking-wider text-muted">Mechanics score</div>
          <div className="mt-1 text-2xl font-black text-fai nums">{report.findings.length > 0 ? report.score : '—'}</div>
        </div>
        <div className="rounded-lg border border-line bg-panel p-3">
          <div className="text-[9px] font-bold uppercase tracking-wider text-muted">Data completeness</div>
          <div className="mt-1 text-2xl font-black text-chalk nums">{report.completeness}%</div>
        </div>
      </div>

      {report.findings.length > 0 ? (
        <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
          {report.findings.map((finding) => (
            <article key={finding.category} className="rounded-lg border border-line bg-panel p-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-[9px] font-bold uppercase tracking-wider text-muted">{CATEGORY_LABEL[finding.category]}</div>
                  <div className="text-xs font-black text-chalk">{finding.label}</div>
                </div>
                <div className="text-sm font-black text-chalk nums">{formatFindingValue(finding.value, finding.unit)}</div>
              </div>
              <div className={`mt-2 inline-flex rounded-full border px-2 py-0.5 text-[9px] font-black uppercase tracking-wider ${SEVERITY_STYLE[finding.severity]}`}>
                {finding.severity}
              </div>
              <div className="mt-2 text-[11px] leading-relaxed text-muted">{finding.summary}</div>
              <div className="mt-2 rounded-md bg-panel-2/80 p-2 text-[11px] font-semibold leading-relaxed text-chalk">
                <span className="text-fai">Cue:</span> {finding.coachingCue}
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-line p-3 text-xs text-muted">
          Mark plant and release timing, then add release-frame landmarks to generate the mechanics score and coaching cues.
        </div>
      )}

      <div className="rounded-lg border border-line bg-panel p-3">
        <div className="flex flex-wrap items-center gap-2">
          <div>
            <div className="text-[10px] font-black uppercase tracking-wider text-muted">Compare with saved throw</div>
            <div className="text-[11px] text-muted">Saved throws for the selected quarterback are prioritized.</div>
          </div>
          <select
            value={baselinePlayId}
            onChange={(event) => setBaselinePlayId(event.target.value)}
            className="ml-auto min-w-56 rounded-lg border border-line bg-panel-2 px-3 py-2 text-xs font-semibold text-chalk outline-none focus:border-fai"
            aria-label="Quarterback mechanics comparison throw"
          >
            <option value="">No baseline selected</option>
            {savedThrows.map((item) => <option key={item.play.id} value={item.play.id}>{item.label}</option>)}
          </select>
        </div>
        {comparison && baseline && (
          <div className="mt-3 grid gap-2 sm:grid-cols-3">
            <div className="rounded-lg border border-line bg-panel-2/50 p-2">
              <div className="text-[9px] uppercase text-muted">Score change</div>
              <div className={`text-lg font-black nums ${comparison.scoreDelta > 0 ? 'text-up' : comparison.scoreDelta < 0 ? 'text-down' : 'text-chalk'}`}>
                {comparison.scoreDelta > 0 ? '+' : ''}{comparison.scoreDelta}
              </div>
            </div>
            <div className="rounded-lg border border-line bg-panel-2/50 p-2">
              <div className="text-[9px] uppercase text-muted">Improved</div>
              <div className="mt-1 text-xs font-bold text-up">{categoryList(comparison.improved)}</div>
            </div>
            <div className="rounded-lg border border-line bg-panel-2/50 p-2">
              <div className="text-[9px] uppercase text-muted">Regressed</div>
              <div className="mt-1 text-xs font-bold text-down">{categoryList(comparison.regressed)}</div>
            </div>
          </div>
        )}
      </div>

      {printMessage && <div className="text-xs font-bold text-fai">{printMessage}</div>}
    </section>
  )
}

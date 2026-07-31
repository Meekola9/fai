import type { ThrowAnalysis } from '../types'
import {
  buildQbMechanicsReport,
  type QbMechanicsCategory,
  type QbMechanicsFinding,
} from './qbMechanics'

const CATEGORY_LABEL: Record<QbMechanicsCategory, string> = {
  timing: 'Timing',
  'upper-body': 'Upper body',
  separation: 'Separation',
  base: 'Base',
  stride: 'Stride',
  release: 'Release',
}

export interface QbMechanicsPrintComparison {
  label: string
  scoreDelta: number
  improved: QbMechanicsCategory[]
  regressed: QbMechanicsCategory[]
}

export interface QbMechanicsPrintInput {
  analysis: ThrowAnalysis
  quarterbackName?: string
  filmLabel?: string
  opponent?: string
  date?: string
  comparison?: QbMechanicsPrintComparison
}

function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

function findingValue(finding: QbMechanicsFinding): string {
  if (typeof finding.value !== 'number' || !Number.isFinite(finding.value)) return 'Not measured'
  const digits = finding.unit === 's' ? 2 : finding.unit === '% frame' ? 1 : 0
  return `${finding.value.toFixed(digits)}${finding.unit ?? ''}`
}

function listCategories(categories: QbMechanicsCategory[]): string {
  return categories.length > 0
    ? categories.map((category) => CATEGORY_LABEL[category]).join(', ')
    : 'None'
}

export function qbMechanicsReportHtml(input: QbMechanicsPrintInput): string {
  const report = buildQbMechanicsReport(input.analysis)
  const title = input.quarterbackName
    ? `${input.quarterbackName} · Quarterback Mechanics`
    : 'Quarterback Mechanics Report'
  const context = [input.date, input.opponent ? `vs ${input.opponent}` : undefined, input.filmLabel]
    .filter(Boolean)
    .join(' · ')
  const findings = report.findings.map((finding) => `
    <article class="finding ${finding.severity}">
      <div class="finding-head">
        <div>
          <div class="category">${escapeHtml(CATEGORY_LABEL[finding.category])}</div>
          <h3>${escapeHtml(finding.label)}</h3>
        </div>
        <div class="value">${escapeHtml(findingValue(finding))}</div>
      </div>
      <div class="status">${escapeHtml(finding.severity.toUpperCase())}</div>
      <p>${escapeHtml(finding.summary)}</p>
      <div class="cue"><strong>Coaching cue:</strong> ${escapeHtml(finding.coachingCue)}</div>
    </article>`).join('')
  const comparison = input.comparison ? `
    <section class="comparison">
      <h2>Comparison</h2>
      <p><strong>Baseline:</strong> ${escapeHtml(input.comparison.label)}</p>
      <p><strong>Score change:</strong> ${input.comparison.scoreDelta >= 0 ? '+' : ''}${escapeHtml(input.comparison.scoreDelta)}</p>
      <p><strong>Improved:</strong> ${escapeHtml(listCategories(input.comparison.improved))}</p>
      <p><strong>Regressed:</strong> ${escapeHtml(listCategories(input.comparison.regressed))}</p>
    </section>` : ''

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(title)}</title>
  <style>
    :root { color-scheme: light; font-family: Inter, ui-sans-serif, system-ui, sans-serif; }
    * { box-sizing: border-box; }
    body { margin: 0; background: #eef2f7; color: #101827; }
    main { width: min(980px, calc(100% - 32px)); margin: 24px auto; }
    header { padding: 28px; border-radius: 18px; background: #08111d; color: white; }
    h1 { margin: 0; font-size: 30px; }
    h2 { margin: 0 0 12px; font-size: 18px; }
    h3 { margin: 2px 0 0; font-size: 16px; }
    .context { margin-top: 8px; color: #b6c4d5; }
    .scores { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; margin-top: 20px; }
    .score { padding: 16px; border: 1px solid #26384c; border-radius: 12px; background: #101e2e; }
    .score b { display: block; font-size: 30px; color: #37d8ff; }
    .score span { font-size: 11px; text-transform: uppercase; letter-spacing: .12em; color: #a9b8c9; }
    .grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px; margin-top: 18px; }
    .finding, .comparison, .notice { break-inside: avoid; padding: 18px; border: 1px solid #d8e0ea; border-radius: 14px; background: white; }
    .finding-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; }
    .category { font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: .12em; color: #6b7788; }
    .value { font-size: 20px; font-weight: 900; white-space: nowrap; }
    .status { display: inline-block; margin-top: 10px; padding: 4px 8px; border-radius: 999px; font-size: 10px; font-weight: 900; letter-spacing: .08em; }
    .strength .status { background: #dff8e9; color: #176a39; }
    .watch .status { background: #fff2c9; color: #795900; }
    .priority .status { background: #ffe0e0; color: #9f2424; }
    .finding p { margin: 12px 0; line-height: 1.5; color: #344154; }
    .cue { padding: 10px 12px; border-radius: 10px; background: #f1f5f9; line-height: 1.45; }
    .comparison, .notice { margin-top: 18px; }
    .comparison p { margin: 7px 0; }
    .notice { font-size: 12px; line-height: 1.5; color: #566274; }
    @media (max-width: 680px) { .grid, .scores { grid-template-columns: 1fr; } }
    @media print { body { background: white; } main { width: 100%; margin: 0; } header { border-radius: 0; } .finding, .comparison, .notice { box-shadow: none; } }
  </style>
</head>
<body>
  <main>
    <header>
      <h1>${escapeHtml(title)}</h1>
      ${context ? `<div class="context">${escapeHtml(context)}</div>` : ''}
      <div class="scores">
        <div class="score"><span>Mechanics score</span><b>${report.score}</b></div>
        <div class="score"><span>Data completeness</span><b>${report.completeness}%</b></div>
      </div>
    </header>
    <section class="grid">
      ${findings || '<div class="notice">Add plant and release timing plus release-frame landmarks to generate mechanics grades.</div>'}
    </section>
    ${comparison}
    <section class="notice">
      Measurements are coach-assisted 2D observations from the available camera angle. They are not laboratory-grade 3D biomechanics and should be interpreted with film context.
    </section>
  </main>
  <script>window.addEventListener('load', () => window.print())</script>
</body>
</html>`
}

import { useState } from 'react'
import { Card } from './ui'
import type { ChiefEntry, ChiefKingPlan, KingPosition } from '../types'
import { KING_POSITION_LABEL, buildChiefKingPlaybook } from '../lib/chiefToKing'

interface Props {
  opponent: string
  plan?: ChiefKingPlan
  onSave: (plan: Omit<ChiefKingPlan, 'id' | 'createdAt'> & { id?: string }) => void
  onRemove: (id: string) => void
}

const POSITIONS: KingPosition[] = ['qb', 'mlb', 'de', 'safety', 'skill', 'other']

function newChiefId(): string {
  return `chief_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`
}

const inputClass =
  'w-full rounded-lg border border-line bg-panel px-3 py-2 text-sm text-chalk placeholder:text-muted/60 outline-none focus:border-fai'

/** Coach worksheet: name the opponent's King + Chiefs, mark the weakest, get the attack plan. */
// The parent keys this component by opponent, so it remounts (re-initializing
// from the saved plan) whenever the game changes — no state-syncing effect.
export function ChiefKingWorksheet({ opponent, plan, onSave, onRemove }: Props) {
  const [kingLabel, setKingLabel] = useState(plan?.kingLabel ?? '')
  const [kingPosition, setKingPosition] = useState<KingPosition>(plan?.kingPosition ?? 'qb')
  const [chiefs, setChiefs] = useState<ChiefEntry[]>(plan?.chiefs ?? [])
  const [weakestChiefId, setWeakestChiefId] = useState<string | undefined>(plan?.weakestChiefId)
  const [note, setNote] = useState(plan?.note ?? '')

  const draft: ChiefKingPlan = {
    id: plan?.id ?? 'draft',
    opponent,
    kingLabel,
    kingPosition,
    chiefs,
    weakestChiefId,
    note: note || undefined,
  }
  const playbook = buildChiefKingPlaybook(draft)

  function addChief() {
    setChiefs((cs) => [...cs, { id: newChiefId(), label: '', role: '' }])
  }
  function updateChief(id: string, patch: Partial<ChiefEntry>) {
    setChiefs((cs) => cs.map((c) => (c.id === id ? { ...c, ...patch } : c)))
  }
  function removeChief(id: string) {
    setChiefs((cs) => cs.filter((c) => c.id !== id))
    if (weakestChiefId === id) setWeakestChiefId(undefined)
  }
  function save() {
    onSave({
      id: plan?.id,
      opponent,
      kingLabel: kingLabel.trim(),
      kingPosition,
      chiefs: chiefs.filter((c) => c.label.trim()),
      weakestChiefId,
      note: note.trim() || undefined,
    })
  }

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between gap-2">
        <div className="text-sm font-black text-chalk">Chief-to-King plan · vs {opponent}</div>
        {plan && (
          <button type="button" onClick={() => onRemove(plan.id)} className="text-xs font-bold text-muted hover:text-down">
            Clear plan
          </button>
        )}
      </div>

      {/* King */}
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <div>
          <div className="text-[10px] font-black uppercase tracking-wider text-fai">The King</div>
          <input
            value={kingLabel}
            onChange={(e) => setKingLabel(e.target.value)}
            placeholder="e.g. #7 QB Johnson"
            className={inputClass + ' mt-1'}
          />
        </div>
        <div>
          <div className="text-[10px] font-black uppercase tracking-wider text-muted">Position type</div>
          <select value={kingPosition} onChange={(e) => setKingPosition(e.target.value as KingPosition)} className={inputClass + ' mt-1'}>
            {POSITIONS.map((p) => (
              <option key={p} value={p}>{KING_POSITION_LABEL[p]}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Chiefs */}
      <div className="mt-3">
        <div className="flex items-center justify-between">
          <div className="text-[10px] font-black uppercase tracking-wider text-gold">The Chiefs — mark the weakest ◎</div>
          <button type="button" onClick={addChief} className="rounded-lg border border-line px-2 py-1 text-xs font-bold text-chalk hover:border-fai">+ Chief</button>
        </div>
        <div className="mt-2 space-y-2">
          {chiefs.length === 0 && <div className="text-xs text-muted">Add the 2–3 players who make the King effective.</div>}
          {chiefs.map((c) => (
            <div key={c.id} className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setWeakestChiefId(c.id)}
                title="Mark as the weakest Chief (the one to attack)"
                className={`shrink-0 grid h-7 w-7 place-items-center rounded-full border text-xs font-black ${weakestChiefId === c.id ? 'border-flame bg-flame/20 text-flame' : 'border-line text-muted'}`}
              >
                {weakestChiefId === c.id ? '◉' : '◎'}
              </button>
              <input value={c.label} onChange={(e) => updateChief(c.id, { label: e.target.value })} placeholder="#42 MIKE" className={inputClass} />
              <input value={c.role ?? ''} onChange={(e) => updateChief(c.id, { role: e.target.value })} placeholder="role" className={inputClass + ' max-w-28'} />
              <button type="button" onClick={() => removeChief(c.id)} aria-label="Remove chief" className="shrink-0 text-muted hover:text-down">✕</button>
            </div>
          ))}
        </div>
      </div>

      <input
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Notes (optional) — tells, protections, reminders…"
        className={inputClass + ' mt-3'}
      />

      <div className="mt-3 flex items-center gap-2">
        <button type="button" onClick={save} className="rounded-lg bg-fai px-4 py-2 text-sm font-bold text-ink">Save plan</button>
        {!playbook.complete && <span className="text-xs text-muted">Still need {playbook.missing.join(', ')}.</span>}
      </div>

      {/* Generated attack plan */}
      {playbook.complete && (
        <div className="mt-4 rounded-lg border border-fai/30 bg-panel-2/40 p-3">
          <div className="text-[10px] font-black uppercase tracking-wider text-fai">Attack plan</div>
          <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-chalk">
            {playbook.steps.map((s, i) => <li key={i}>{s}</li>)}
          </ol>
          <p className="mt-2 text-sm text-muted"><span className="font-bold text-chalk">{playbook.kingPositionLabel}:</span> {playbook.positionPlay}</p>
        </div>
      )}
    </Card>
  )
}

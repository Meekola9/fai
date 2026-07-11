import { useEffect, useMemo, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store/useStore'
import { ALL_LEADERBOARDS, positionGroupBoards, type LeaderRow } from '../lib/leaderboards'
import type { AthleteResult } from '../types'
import { Avatar } from '../components/ui'

const ROTATE_MS = 9000

function trendGlyph(v: number, hasPrev: boolean) {
  if (!hasPrev) return { g: '—', c: 'text-flat' }
  if (v > 0.05) return { g: '▲', c: 'text-up' }
  if (v < -0.05) return { g: '▼', c: 'text-down' }
  return { g: '—', c: 'text-flat' }
}

interface Slide {
  id: string
  title: string
  subtitle: string
  rows: (results: AthleteResult[]) => LeaderRow[]
  metricLabel: string
  groups?: boolean
}

const SLIDE_DEFS: Slide[] = [
  { id: 'fai', title: 'Overall FAI', subtitle: 'Top 10 · Football Athlete Index', rows: (r) => ALL_LEADERBOARDS.find((b) => b.id === 'fai')!.rows(r), metricLabel: 'FAI' },
  { id: 'improved', title: 'Most Improved', subtitle: 'Biggest FAI gains since last test', rows: (r) => ALL_LEADERBOARDS.find((b) => b.id === 'improved')!.rows(r), metricLabel: 'FAI Gain' },
  { id: 'best40', title: 'Fastest 40', subtitle: 'Top 40-yard dash times', rows: (r) => ALL_LEADERBOARDS.find((b) => b.id === 'test-best40')!.rows(r), metricLabel: '40 Dash' },
  { id: 'bestFly', title: 'Fastest 10 Fly', subtitle: 'Top 10-yard fly times', rows: (r) => ALL_LEADERBOARDS.find((b) => b.id === 'test-bestFly')!.rows(r), metricLabel: '10 Fly' },
  { id: 'bench', title: 'Best Bench', subtitle: 'Top bench press maxes', rows: (r) => ALL_LEADERBOARDS.find((b) => b.id === 'test-benchMax')!.rows(r), metricLabel: 'Bench' },
  { id: 'squat', title: 'Best Squat', subtitle: 'Top squat maxes', rows: (r) => ALL_LEADERBOARDS.find((b) => b.id === 'test-squatMax')!.rows(r), metricLabel: 'Squat' },
  { id: 'hang', title: 'Best Hang Clean', subtitle: 'Most bodyweight reps', rows: (r) => ALL_LEADERBOARDS.find((b) => b.id === 'test-hangCleanReps')!.rows(r), metricLabel: 'Reps' },
  { id: 'broad', title: 'Best Broad Jump', subtitle: 'Top broad jumps', rows: (r) => ALL_LEADERBOARDS.find((b) => b.id === 'test-broadJump')!.rows(r), metricLabel: 'Broad' },
  { id: 'vert', title: 'Best Vertical', subtitle: 'Top vertical jumps', rows: (r) => ALL_LEADERBOARDS.find((b) => b.id === 'test-verticalJump')!.rows(r), metricLabel: 'Vertical' },
  { id: 'shuttle', title: 'Best Shuttle', subtitle: 'Top 20-yard shuttle times', rows: (r) => ALL_LEADERBOARDS.find((b) => b.id === 'test-best20Shuttle')!.rows(r), metricLabel: '20 Shuttle' },
  { id: 'cond', title: 'Best Conditioning', subtitle: 'Top conditioning scores', rows: (r) => ALL_LEADERBOARDS.find((b) => b.id === 'conditioning')!.rows(r), metricLabel: 'COND' },
  { id: 'groups', title: 'Position Group Leaders', subtitle: 'Top athlete in each group', rows: () => [], metricLabel: 'FAI', groups: true },
]

export default function TVMode() {
  const { results } = useStore()
  const nav = useNavigate()
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)

  const slides = useMemo(() => SLIDE_DEFS.filter((s) => {
    if (s.groups) return positionGroupBoards(results).length > 0
    return s.rows(results).length > 0
  }), [results])

  const slide = slides[index] ?? slides[0]

  const advance = useCallback(
    (dir: 1 | -1) => setIndex((i) => (i + dir + slides.length) % slides.length),
    [slides.length],
  )

  useEffect(() => {
    if (paused || slides.length <= 1) return
    const t = setInterval(() => setIndex((i) => (i + 1) % slides.length), ROTATE_MS)
    return () => clearInterval(t)
  }, [paused, slides.length])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'ArrowRight') advance(1)
      else if (e.key === 'ArrowLeft') advance(-1)
      else if (e.key === ' ') { e.preventDefault(); setPaused((p) => !p) }
      else if (e.key === 'Escape') nav('/')
      else if (e.key.toLowerCase() === 'f') toggleFullscreen()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [advance, nav])

  function toggleFullscreen() {
    if (!document.fullscreenElement) document.documentElement.requestFullscreen?.()
    else document.exitFullscreen?.()
  }

  if (!results.length || !slide) {
    return (
      <div className="grid min-h-screen place-items-center bg-ink text-center">
        <div>
          <div className="text-2xl font-black text-muted">No data to display</div>
          <button onClick={() => nav('/data')} className="mt-4 rounded-lg bg-fai px-5 py-2 font-bold text-ink">
            Load Sample Data
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-ink">
      {/* ambient broadcast glow */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(1400px_700px_at_50%_-10%,rgba(34,211,238,0.14),transparent_60%)]" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-fai via-flame to-fai" />

      <div className="relative mx-auto flex min-h-screen max-w-[1600px] flex-col px-8 py-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="grid h-14 w-14 place-items-center rounded-xl border-2 border-fai/50 bg-fai/10 text-xl font-black text-fai">
              FAI
            </div>
            <div>
              <div className="text-[13px] font-bold uppercase tracking-[0.35em] text-fai">
                Football Athlete Index
              </div>
              <div className="text-4xl font-black leading-none tracking-tight text-chalk 2xl:text-5xl">
                {slide.title}
              </div>
              <div className="mt-1 text-sm font-semibold uppercase tracking-widest text-muted">
                {slide.subtitle}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex gap-1.5">
              {slides.map((s, i) => (
                <button
                  key={s.id}
                  onClick={() => setIndex(i)}
                  className={`h-2 rounded-full transition-all ${
                    i === index ? 'w-8 bg-fai' : 'w-2 bg-line hover:bg-muted'
                  }`}
                  aria-label={s.title}
                />
              ))}
            </div>
            <button onClick={() => setPaused((p) => !p)} className="rounded-lg border border-line px-3 py-1.5 text-sm font-bold text-muted hover:text-chalk">
              {paused ? '▶ Play' : '❚❚ Pause'}
            </button>
            <button onClick={toggleFullscreen} className="rounded-lg border border-line px-3 py-1.5 text-sm font-bold text-muted hover:text-chalk">
              ⛶ Full
            </button>
            <button onClick={() => nav('/')} className="rounded-lg border border-line px-3 py-1.5 text-sm font-bold text-muted hover:text-chalk">
              ✕ Exit
            </button>
          </div>
        </div>

        {/* Body */}
        <div key={slide.id} className="animate-slide mt-6 flex-1">
          {slide.groups ? (
            <GroupGrid results={results} />
          ) : (
            <LeaderGrid rows={slide.rows(results)} metricLabel={slide.metricLabel} />
          )}
        </div>

        <div className="mt-4 text-center text-xs font-semibold uppercase tracking-widest text-muted/60">
          ← → change board · space to pause · F fullscreen · Esc exit
        </div>
      </div>
    </div>
  )
}

function BigCard({ row, rank, metricLabel }: { row: LeaderRow; rank: number; metricLabel: string }) {
  const r = row.result
  const a = r.athlete
  const t = trendGlyph(r.faiImprovement, !!r.previous)
  const podium = rank <= 3
  return (
    <div
      className={`flex items-center gap-4 rounded-2xl border px-5 py-4 ${
        rank === 1
          ? 'border-gold/50 bg-gradient-to-r from-gold/15 to-transparent'
          : podium
            ? 'border-fai/40 bg-fai/5'
            : 'border-line bg-panel/70'
      }`}
    >
      <div
        className={`grid h-14 w-14 shrink-0 place-items-center rounded-xl text-2xl font-black nums ${
          rank === 1 ? 'bg-gold/25 text-gold' : podium ? 'bg-fai/20 text-fai' : 'bg-panel-2 text-muted'
        }`}
      >
        {rank}
      </div>
      <Avatar name={a.name} photoUrl={a.photoUrl} size={56} />
      <div className="min-w-0 flex-1">
        <div className="truncate text-2xl font-black tracking-tight text-chalk">{a.name}</div>
        <div className="text-sm font-semibold uppercase tracking-wide text-muted">
          {a.position} · {a.positionGroup} · Gr {a.grade}
        </div>
        <div className="mt-0.5 text-xs font-semibold text-muted/80">
          Team #{r.teamRank} · {a.positionGroup} #{r.groupRank}
        </div>
      </div>
      <div className="hidden text-right sm:block">
        <div className="text-[10px] font-bold uppercase tracking-wider text-muted">FAI</div>
        <div className="text-2xl font-black nums text-fai">{r.current.fai.toFixed(1)}</div>
        <div className={`text-sm font-black nums ${t.c}`}>
          {t.g} {r.previous ? `${r.faiImprovement >= 0 ? '+' : ''}${r.faiImprovement.toFixed(1)}` : ''}
        </div>
      </div>
      <div className="w-28 shrink-0 text-right">
        <div className="text-[10px] font-bold uppercase tracking-wider text-muted">{metricLabel}</div>
        <div className="text-3xl font-black nums text-chalk">{row.display}</div>
      </div>
    </div>
  )
}

function LeaderGrid({ rows, metricLabel }: { rows: LeaderRow[]; metricLabel: string }) {
  const top = rows.slice(0, 10)
  const left = top.slice(0, 5)
  const right = top.slice(5, 10)
  return (
    <div className="grid gap-3 lg:grid-cols-2">
      <div className="space-y-3">
        {left.map((row) => (
          <BigCard key={row.result.athlete.id} row={row} rank={row.rank} metricLabel={metricLabel} />
        ))}
      </div>
      <div className="space-y-3">
        {right.map((row) => (
          <BigCard key={row.result.athlete.id} row={row} rank={row.rank} metricLabel={metricLabel} />
        ))}
      </div>
    </div>
  )
}

function GroupGrid({ results }: { results: AthleteResult[] }) {
  const boards = positionGroupBoards(results)
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {boards.map((b) => {
        const leader = b.rows[0]
        const a = leader.result.athlete
        const t = trendGlyph(leader.result.faiImprovement, !!leader.result.previous)
        return (
          <div key={b.group} className="rounded-2xl border border-line bg-panel/70 p-5">
            <div className="flex items-center justify-between">
              <span className="rounded-lg bg-flame/20 px-3 py-1 text-lg font-black text-flame">{b.group}</span>
              <span className="text-xs font-semibold uppercase text-muted">{b.rows.length} athletes</span>
            </div>
            <div className="mt-3 flex items-center gap-3">
              <Avatar name={a.name} photoUrl={a.photoUrl} size={52} />
              <div className="min-w-0">
                <div className="truncate text-xl font-black text-chalk">{a.name}</div>
                <div className="text-xs font-semibold uppercase text-muted">
                  {a.position} · Gr {a.grade}
                </div>
              </div>
            </div>
            <div className="mt-3 flex items-end justify-between">
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-muted">FAI</div>
                <div className="text-4xl font-black nums text-fai">{leader.result.current.fai.toFixed(1)}</div>
              </div>
              <div className={`text-lg font-black nums ${t.c}`}>
                {t.g} {leader.result.previous ? `${leader.result.faiImprovement >= 0 ? '+' : ''}${leader.result.faiImprovement.toFixed(1)}` : ''}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

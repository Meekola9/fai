import { useLocation, useNavigate } from 'react-router-dom'
import { Card } from '../components/ui'
import BroadJumpStandards from './BroadJumpStandards'
import VerticalBenchmarks from './VerticalBenchmarks'

type JumpView = 'broad' | 'vertical'

function jumpViewFromLocation(pathname: string, search: string): JumpView {
  if (pathname.startsWith('/vertical')) return 'vertical'
  const requested = new URLSearchParams(search).get('jump')
  return requested === 'vertical' ? 'vertical' : 'broad'
}

const VIEWS: readonly {
  id: JumpView
  title: string
  eyebrow: string
  description: string
}[] = [
  {
    id: 'broad',
    title: 'Broad Jump',
    eyebrow: 'Horizontal power',
    description: 'Position-family football tiers plus the separate historical general percentile chart.',
  },
  {
    id: 'vertical',
    title: 'Vertical Jump',
    eyebrow: 'Vertical power',
    description: 'Position-family benchmarks with National HS, Georgia HS, and NCAA projection contexts.',
  },
]

export default function ExplosiveJumpStandards() {
  const location = useLocation()
  const navigate = useNavigate()
  const active = jumpViewFromLocation(location.pathname, location.search)

  function openView(view: JumpView) {
    navigate(`/development?section=vertical&jump=${view}`)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="text-xs font-black uppercase tracking-[0.2em] text-fai">Explosive Power Standards</div>
          <h1 className="mt-1 text-3xl font-black tracking-tight text-chalk">Jump Standards</h1>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted">
            Compare horizontal and vertical explosion without mixing football-specific coaching standards with general historical reference data.
          </p>
        </div>
      </div>

      <Card className="p-2">
        <div className="grid gap-2 sm:grid-cols-2" role="tablist" aria-label="Explosive jump standards">
          {VIEWS.map((view) => {
            const selected = active === view.id
            return (
              <button
                key={view.id}
                type="button"
                role="tab"
                aria-selected={selected}
                onClick={() => openView(view.id)}
                className={`rounded-xl border p-4 text-left transition ${selected ? 'border-fai/50 bg-fai/10' : 'border-transparent bg-panel-2/35 hover:border-line'}`}
              >
                <div className={`text-[10px] font-black uppercase tracking-[0.16em] ${selected ? 'text-fai' : 'text-muted'}`}>{view.eyebrow}</div>
                <div className="mt-1 text-lg font-black text-chalk">{view.title}</div>
                <div className="mt-1 text-xs leading-relaxed text-muted">{view.description}</div>
              </button>
            )
          })}
        </div>
      </Card>

      <div role="tabpanel" aria-label={active === 'broad' ? 'Broad jump standards' : 'Vertical jump standards'}>
        {active === 'broad' ? <BroadJumpStandards /> : <VerticalBenchmarks embedded />}
      </div>
    </div>
  )
}

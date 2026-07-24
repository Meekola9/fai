import { useLocation, useNavigate } from 'react-router-dom'
import Archetypes from './Archetypes'
import Badges from './Badges'
import ExplosiveJumpStandards from './ExplosiveJumpStandards'
import { Card } from '../components/ui'
import {
  developmentSectionFromLocation,
  type DevelopmentSection,
} from '../lib/playerDevelopment'

const SECTIONS: readonly {
  id: DevelopmentSection
  eyebrow: string
  title: string
  description: string
  icon: string
}[] = [
  {
    id: 'archetypes',
    eyebrow: 'Identity',
    title: 'Archetypes',
    description: 'Understand the football profile suggested by an athlete’s testing results.',
    icon: '◇',
  },
  {
    id: 'badges',
    eyebrow: 'Achievements',
    title: 'Badges',
    description: 'Review testing milestones, signature identities, and coach-awarded game badges.',
    icon: '◆',
  },
  {
    id: 'vertical',
    eyebrow: 'Standards',
    title: 'Jump Standards',
    description: 'Compare broad-jump and vertical-jump explosion against football standards.',
    icon: '↥',
  },
]

export default function PlayerDevelopment() {
  const location = useLocation()
  const navigate = useNavigate()
  const active = developmentSectionFromLocation(location.pathname, location.search)

  function openSection(section: DevelopmentSection) {
    navigate(`/development?section=${section}`)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="text-xs font-black uppercase tracking-[0.22em] text-fai">FAI Player Development</div>
        <h1 className="mt-1 text-3xl font-black tracking-tight text-chalk">Development Hub</h1>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted">
          One place to understand what an athlete’s testing profile means, what they have earned, and how their explosive power compares with football standards.
        </p>
      </div>

      <Card className="overflow-hidden p-2">
        <div className="grid gap-2 md:grid-cols-3" role="tablist" aria-label="Player development sections">
          {SECTIONS.map((section) => {
            const selected = active === section.id
            return (
              <button
                key={section.id}
                type="button"
                role="tab"
                aria-selected={selected}
                onClick={() => openSection(section.id)}
                className={`group rounded-xl border p-4 text-left transition ${
                  selected
                    ? 'border-fai/50 bg-fai/10 shadow-[0_0_30px_-18px_rgba(34,211,238,0.8)]'
                    : 'border-transparent bg-panel-2/35 hover:border-line hover:bg-panel-2/70'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl text-xl font-black ${selected ? 'bg-fai text-ink' : 'bg-ink text-muted group-hover:text-chalk'}`}>
                    {section.icon}
                  </div>
                  <div className="min-w-0">
                    <div className={`text-[10px] font-black uppercase tracking-[0.18em] ${selected ? 'text-fai' : 'text-muted'}`}>{section.eyebrow}</div>
                    <div className="mt-0.5 text-base font-black text-chalk">{section.title}</div>
                    <div className="mt-1 text-xs leading-relaxed text-muted">{section.description}</div>
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      </Card>

      <div role="tabpanel" aria-label={SECTIONS.find((section) => section.id === active)?.title}>
        {active === 'archetypes' && <Archetypes />}
        {active === 'badges' && <Badges />}
        {active === 'vertical' && <ExplosiveJumpStandards />}
      </div>
    </div>
  )
}

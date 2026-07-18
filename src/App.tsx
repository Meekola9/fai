import { NavLink, Route, Routes, useLocation } from 'react-router-dom'
import { useStore } from './store/useStore'
import Dashboard from './pages/Dashboard'
import Leaderboards from './pages/Leaderboards'
import Athletes from './pages/Athletes'
import AthleteProfile from './pages/AthleteProfile'
import AthleteEditor from './pages/AthleteEditor'
import SessionEntry from './pages/SessionEntry'
import DataPage from './pages/DataPage'
import TVMode from './pages/TVMode'
import PwaControls, { ConnectivityBadge } from './components/PwaControls'

const NAV = [
  { to: '/', label: 'Coach Dashboard', end: true },
  { to: '/leaderboards', label: 'Leaderboards' },
  { to: '/athletes', label: 'Athletes' },
  { to: '/entry', label: 'Enter Testing' },
  { to: '/data', label: 'Data' },
]

const MOBILE_NAV = [
  { to: '/', label: 'Dashboard', icon: '⌂', end: true },
  { to: '/athletes', label: 'Athletes', icon: '◉' },
  { to: '/entry', label: 'Test', icon: '+' },
  { to: '/leaderboards', label: 'Rankings', icon: '★' },
  { to: '/data', label: 'More', icon: '•••' },
]

function Brand() {
  return (
    <div className="flex items-center gap-2">
      <div className="grid h-9 w-9 place-items-center rounded-lg border border-fai/40 bg-fai/10 text-sm font-black tracking-tight text-fai">
        FAI
      </div>
      <div className="hidden leading-tight min-[390px]:block">
        <div className="text-sm font-black tracking-tight text-chalk">
          Football Athlete Index
        </div>
        <div className="hidden text-[10px] font-semibold uppercase tracking-[0.2em] text-muted sm:block">
          Combine Testing System
        </div>
      </div>
    </div>
  )
}

function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-ink/90 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-3 py-3 sm:px-4">
        <NavLink to="/" aria-label="FAI dashboard">
          <Brand />
        </NavLink>

        <nav className="hidden items-center gap-1 md:flex">
          {NAV.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.end}
              className={({ isActive }) =>
                `rounded-lg px-3 py-1.5 text-sm font-semibold transition ${
                  isActive
                    ? 'bg-fai/15 text-fai'
                    : 'text-muted hover:bg-panel-2 hover:text-chalk'
                }`
              }
            >
              {n.label}
            </NavLink>
          ))}
          <ConnectivityBadge />
          <NavLink
            to="/tv"
            className="ml-1 rounded-lg border border-flame/40 bg-flame/10 px-3 py-1.5 text-sm font-bold text-flame transition hover:bg-flame/20"
          >
            📺 TV Mode
          </NavLink>
        </nav>

        <div className="flex items-center gap-2 md:hidden">
          <ConnectivityBadge />
          <NavLink
            to="/tv"
            className="grid h-9 min-w-9 place-items-center rounded-lg border border-flame/40 bg-flame/10 px-2 text-xs font-black text-flame"
            aria-label="Open TV Mode"
          >
            TV
          </NavLink>
        </div>
      </div>
    </header>
  )
}

function MobileNavigation() {
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-ink/95 px-1 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
      aria-label="Mobile navigation"
    >
      <div className="mx-auto grid max-w-lg grid-cols-5">
        {MOBILE_NAV.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              `flex min-h-16 flex-col items-center justify-center gap-1 rounded-xl px-1 py-2 text-[10px] font-bold transition ${
                isActive ? 'text-fai' : 'text-muted active:bg-panel-2'
              }`
            }
          >
            <span className="grid h-6 place-items-center text-lg font-black leading-none" aria-hidden="true">
              {item.icon}
            </span>
            <span>{item.label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  )
}

function Loading() {
  return (
    <div className="grid min-h-screen place-items-center text-muted">
      <div className="animate-pulse text-sm font-semibold uppercase tracking-widest">
        Loading FAI…
      </div>
    </div>
  )
}

export default function App() {
  const { loading } = useStore()
  const location = useLocation()
  const isTv = location.pathname.startsWith('/tv')

  if (loading) return <Loading />

  // TV mode renders full-bleed with no app chrome.
  if (isTv) {
    return (
      <Routes>
        <Route path="/tv" element={<TVMode />} />
      </Routes>
    )
  }

  return (
    <div className="min-h-screen pb-[calc(5rem+env(safe-area-inset-bottom))] md:pb-0">
      <Header />
      <main className="mx-auto max-w-7xl px-3 py-4 sm:px-4 sm:py-6">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/leaderboards" element={<Leaderboards />} />
          <Route path="/athletes" element={<Athletes />} />
          <Route path="/athletes/new" element={<AthleteEditor />} />
          <Route path="/athletes/:id" element={<AthleteProfile />} />
          <Route path="/athletes/:id/edit" element={<AthleteEditor />} />
          <Route path="/entry" element={<SessionEntry />} />
          <Route path="/data" element={<DataPage />} />
        </Routes>
      </main>
      <footer className="mx-auto hidden max-w-7xl px-4 pb-10 pt-4 text-center text-xs text-muted md:block">
        FAI — Football Athlete Index · Local-first with on-device backup
      </footer>
      <PwaControls />
      <MobileNavigation />
    </div>
  )
}

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

const NAV = [
  { to: '/', label: 'Coach Dashboard', end: true },
  { to: '/leaderboards', label: 'Leaderboards' },
  { to: '/athletes', label: 'Athletes' },
  { to: '/entry', label: 'Enter Testing' },
  { to: '/data', label: 'Data' },
]

function Brand() {
  return (
    <div className="flex items-center gap-2">
      <div className="grid h-9 w-9 place-items-center rounded-lg border border-fai/40 bg-fai/10 text-sm font-black tracking-tight text-fai">
        FAI
      </div>
      <div className="leading-tight">
        <div className="text-sm font-black tracking-tight text-chalk">
          Football Athlete Index
        </div>
        <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted">
          Combine Testing System
        </div>
      </div>
    </div>
  )
}

function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-ink/85 backdrop-blur">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3">
        <NavLink to="/">
          <Brand />
        </NavLink>
        <nav className="flex flex-1 flex-wrap items-center gap-1 md:flex-none md:justify-end">
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
          <NavLink
            to="/tv"
            className="ml-1 rounded-lg border border-flame/40 bg-flame/10 px-3 py-1.5 text-sm font-bold text-flame transition hover:bg-flame/20"
          >
            📺 TV Mode
          </NavLink>
        </nav>
      </div>
    </header>
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

  // TV mode renders full-bleed with no chrome.
  if (isTv) {
    return (
      <Routes>
        <Route path="/tv" element={<TVMode />} />
      </Routes>
    )
  }

  return (
    <div className="min-h-screen">
      <Header />
      <main className="mx-auto max-w-7xl px-4 py-6">
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
      <footer className="mx-auto max-w-7xl px-4 pb-10 pt-4 text-center text-xs text-muted">
        FAI — Football Athlete Index · Data stored locally in your browser
      </footer>
    </div>
  )
}

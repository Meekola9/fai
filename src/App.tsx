import { useState } from 'react'
import { Navigate, NavLink, Route, Routes, useLocation } from 'react-router-dom'
import { useStore } from './store/useStore'
import Dashboard from './pages/Dashboard'
import Leaderboards from './pages/Leaderboards'
import Athletes from './pages/Athletes'
import Archetypes from './pages/Archetypes'
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
  { to: '/archetypes', label: 'Archetypes' },
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
  const { teamName, publicTeamName, viewerMode, storageMode } = useStore()
  const subtitle = viewerMode
    ? `${publicTeamName ?? 'Team'} · View only`
    : teamName ?? (storageMode === 'cloud' ? 'Cloud team' : 'On-device mode')
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
          {subtitle}
        </div>
      </div>
    </div>
  )
}

function Header() {
  const { storageMode, viewerMode, signOut } = useStore()
  const nav = viewerMode
    ? NAV.filter((n) => n.to !== '/entry' && n.to !== '/data')
    : NAV
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-ink/90 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-3 py-3 sm:px-4">
        <NavLink to="/" aria-label="FAI dashboard">
          <Brand />
        </NavLink>

        <nav className="hidden items-center gap-1 md:flex">
          {nav.map((n) => (
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
          {storageMode === 'cloud' && (
            <button
              type="button"
              onClick={() => void signOut()}
              className="ml-1 rounded-lg border border-line px-3 py-1.5 text-xs font-bold text-muted hover:bg-panel-2 hover:text-chalk"
            >
              Sign out
            </button>
          )}
          {viewerMode && (
            <NavLink
              to="/login"
              className="ml-1 rounded-lg border border-line px-3 py-1.5 text-xs font-bold text-muted hover:bg-panel-2 hover:text-chalk"
            >
              Coach Sign In
            </NavLink>
          )}
        </nav>

        <div className="flex items-center gap-2 md:hidden">
          <ConnectivityBadge />
          <NavLink
            to="/archetypes"
            className="grid h-9 min-w-9 place-items-center rounded-lg border border-line bg-panel px-2 text-[10px] font-black text-muted"
            aria-label="Open archetype guide"
          >
            GUIDE
          </NavLink>
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

function MobileNavigation({ viewerMode }: { viewerMode: boolean }) {
  const items = viewerMode
    ? [
        ...MOBILE_NAV.filter((item) => item.to !== '/entry' && item.to !== '/data'),
        { to: '/archetypes', label: 'Guide', icon: '?', end: false },
        { to: '/login', label: 'Sign In', icon: '→', end: false },
      ]
    : MOBILE_NAV
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-ink/95 px-1 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
      aria-label="Mobile navigation"
    >
      <div className={`mx-auto grid max-w-lg ${items.length === 4 ? 'grid-cols-4' : 'grid-cols-5'}`}>
        {items.map((item) => (
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
            <span
              className="grid h-6 place-items-center text-lg font-black leading-none"
              aria-hidden="true"
            >
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

function LoginScreen() {
  const { signIn, authError, viewerMode } = useStore()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [formError, setFormError] = useState<string>()

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy(true)
    setFormError(undefined)
    try {
      await signIn(email, password)
    } catch (error: unknown) {
      setFormError(error instanceof Error ? error.message : 'Sign-in failed.')
      setBusy(false)
    }
  }

  return (
    <div className="grid min-h-screen place-items-center bg-ink px-4 py-10">
      <div className="w-full max-w-md rounded-2xl border border-line bg-panel p-6 shadow-2xl">
        <div className="mb-6 flex items-center gap-3">
          <div className="grid h-12 w-12 place-items-center rounded-xl border border-fai/40 bg-fai/10 text-lg font-black text-fai">
            FAI
          </div>
          <div>
            <h1 className="text-xl font-black text-chalk">Coach Sign In</h1>
            <p className="text-sm text-muted">Secure team cloud storage</p>
          </div>
        </div>

        {(formError || authError) && (
          <div className="mb-4 rounded-xl border border-down/40 bg-down/5 p-3 text-sm text-down">
            {formError || authError}
          </div>
        )}

        <form onSubmit={submit} className="space-y-4">
          <label className="block">
            <span className="mb-1 block text-xs font-bold uppercase tracking-wider text-muted">
              Email
            </span>
            <input
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full rounded-xl border border-line bg-ink px-4 py-3 text-chalk outline-none focus:border-fai"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-bold uppercase tracking-wider text-muted">
              Password
            </span>
            <input
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full rounded-xl border border-line bg-ink px-4 py-3 text-chalk outline-none focus:border-fai"
            />
          </label>
          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-xl bg-fai px-5 py-3 font-black text-ink disabled:cursor-wait disabled:opacity-60"
          >
            {busy ? 'Signing in…' : 'Sign in to FAI'}
          </button>
        </form>
        <p className="mt-4 text-xs leading-relaxed text-muted">
          Use the Supabase account assigned to your team. Athlete records are protected by team membership and row-level security.
        </p>
        {viewerMode && (
          <NavLink
            to="/"
            className="mt-4 inline-block text-sm font-semibold text-fai hover:underline"
          >
            ← Back to team view
          </NavLink>
        )}
      </div>
    </div>
  )
}

function TeamAccessError() {
  const { authError, userEmail, signOut } = useStore()
  return (
    <div className="grid min-h-screen place-items-center bg-ink px-4">
      <div className="w-full max-w-lg rounded-2xl border border-down/40 bg-panel p-6">
        <h1 className="text-xl font-black text-chalk">Team access is not ready</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          {authError ?? 'This account is not linked to an FAI team.'}
        </p>
        {userEmail && <p className="mt-3 text-xs text-muted">Signed in as {userEmail}</p>}
        <button
          type="button"
          onClick={() => void signOut()}
          className="mt-5 rounded-xl border border-line px-4 py-2 text-sm font-bold text-chalk hover:bg-panel-2"
        >
          Sign out
        </button>
      </div>
    </div>
  )
}

export default function App() {
  const {
    loading,
    cloudConfigured,
    signedIn,
    teamName,
    viewerMode,
    storageMode,
  } = useStore()
  const location = useLocation()
  const isTv = location.pathname.startsWith('/tv')

  if (loading) return <Loading />
  if (cloudConfigured && signedIn && !teamName) return <TeamAccessError />

  // Signed-out visitors on a cloud build get the read-only public view when
  // team data is publicly readable; otherwise the classic sign-in gate.
  const signedOut = cloudConfigured && !signedIn
  if (signedOut && !viewerMode) return <LoginScreen />
  if (signedOut && location.pathname === '/login') return <LoginScreen />

  if (isTv) {
    return (
      <Routes>
        <Route path="/tv" element={<TVMode />} />
      </Routes>
    )
  }

  const guarded = (element: React.ReactElement) =>
    viewerMode ? <Navigate to="/login" replace /> : element

  return (
    <div className="min-h-screen pb-[calc(5rem+env(safe-area-inset-bottom))] md:pb-0">
      <Header />
      <main className="mx-auto max-w-7xl px-3 py-4 sm:px-4 sm:py-6">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/leaderboards" element={<Leaderboards />} />
          <Route path="/athletes" element={<Athletes />} />
          <Route path="/archetypes" element={<Archetypes />} />
          <Route path="/athletes/new" element={guarded(<AthleteEditor />)} />
          <Route path="/athletes/:id" element={<AthleteProfile />} />
          <Route path="/athletes/:id/edit" element={guarded(<AthleteEditor />)} />
          <Route path="/entry" element={guarded(<SessionEntry />)} />
          <Route path="/data" element={guarded(<DataPage />)} />
          <Route path="/login" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <footer className="mx-auto hidden max-w-7xl px-4 pb-10 pt-4 text-center text-xs text-muted md:block">
        FAI — Football Athlete Index ·{' '}
        {viewerMode
          ? 'Live team view · read only'
          : storageMode === 'cloud'
            ? 'Secure cloud storage with on-device backup'
            : 'Local-first with on-device backup'}
      </footer>
      <PwaControls />
      <MobileNavigation viewerMode={viewerMode} />
    </div>
  )
}

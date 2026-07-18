import { useEffect, useMemo, useState } from 'react'
import { PWA_UPDATE_EVENT } from '../pwa'

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
}

interface NavigatorWithStandalone extends Navigator {
  standalone?: boolean
}

const DISMISS_KEY = 'fai:pwa-install-dismissed'

function standaloneMode(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    Boolean((navigator as NavigatorWithStandalone).standalone)
  )
}

function useOnlineStatus(): boolean {
  const [online, setOnline] = useState(() => navigator.onLine)

  useEffect(() => {
    const handleOnline = () => setOnline(true)
    const handleOffline = () => setOnline(false)
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  return online
}

export function ConnectivityBadge() {
  const online = useOnlineStatus()
  return (
    <span
      className={`rounded-full border px-2 py-1 text-[10px] font-bold uppercase tracking-wider ${
        online
          ? 'border-up/30 bg-up/10 text-up'
          : 'border-flame/40 bg-flame/10 text-flame'
      }`}
      aria-live="polite"
    >
      {online ? 'On device' : 'Offline'}
    </span>
  )
}

export default function PwaControls() {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [updateRegistration, setUpdateRegistration] = useState<ServiceWorkerRegistration | null>(null)
  const [installed, setInstalled] = useState(() => standaloneMode())
  const [dismissed, setDismissed] = useState(() => {
    try {
      return localStorage.getItem(DISMISS_KEY) === 'true'
    } catch {
      return false
    }
  })

  const isIos = useMemo(
    () => /iphone|ipad|ipod/i.test(navigator.userAgent) && !installed,
    [installed],
  )

  useEffect(() => {
    const handleInstallPrompt = (event: Event) => {
      event.preventDefault()
      setInstallPrompt(event as BeforeInstallPromptEvent)
    }
    const handleInstalled = () => {
      setInstalled(true)
      setInstallPrompt(null)
    }
    const handleUpdate = (event: Event) => {
      setUpdateRegistration(
        (event as CustomEvent<ServiceWorkerRegistration>).detail,
      )
    }

    window.addEventListener('beforeinstallprompt', handleInstallPrompt)
    window.addEventListener('appinstalled', handleInstalled)
    window.addEventListener(PWA_UPDATE_EVENT, handleUpdate)
    return () => {
      window.removeEventListener('beforeinstallprompt', handleInstallPrompt)
      window.removeEventListener('appinstalled', handleInstalled)
      window.removeEventListener(PWA_UPDATE_EVENT, handleUpdate)
    }
  }, [])

  async function install() {
    if (!installPrompt) return
    await installPrompt.prompt()
    const choice = await installPrompt.userChoice
    if (choice.outcome === 'accepted') setInstalled(true)
    setInstallPrompt(null)
  }

  function dismiss() {
    setDismissed(true)
    try {
      localStorage.setItem(DISMISS_KEY, 'true')
    } catch {
      // A private browser may block storage; dismissal remains session-only.
    }
  }

  function activateUpdate() {
    const waiting = updateRegistration?.waiting
    if (!waiting) {
      window.location.reload()
      return
    }

    let reloaded = false
    navigator.serviceWorker.addEventListener(
      'controllerchange',
      () => {
        if (reloaded) return
        reloaded = true
        window.location.reload()
      },
      { once: true },
    )
    waiting.postMessage({ type: 'SKIP_WAITING' })
  }

  if (updateRegistration) {
    return (
      <div className="fixed inset-x-4 bottom-[calc(5.75rem+env(safe-area-inset-bottom))] z-50 mx-auto max-w-sm rounded-2xl border border-fai/40 bg-panel p-4 shadow-2xl md:inset-x-auto md:bottom-6 md:right-6">
        <div className="text-sm font-black text-chalk">FAI update ready</div>
        <p className="mt-1 text-xs leading-relaxed text-muted">
          Reload to use the newest mobile version. Saved testing data stays on this device.
        </p>
        <button
          type="button"
          onClick={activateUpdate}
          className="mt-3 w-full rounded-xl bg-fai px-4 py-2.5 text-sm font-black text-ink"
        >
          Update FAI
        </button>
      </div>
    )
  }

  if (installed || dismissed || (!installPrompt && !isIos)) return null

  return (
    <div className="fixed inset-x-4 bottom-[calc(5.75rem+env(safe-area-inset-bottom))] z-50 mx-auto max-w-sm rounded-2xl border border-line bg-panel p-4 shadow-2xl md:inset-x-auto md:bottom-6 md:right-6">
      <div className="flex items-start gap-3">
        <img src="./fai-icon.svg" alt="" className="h-11 w-11 rounded-xl" />
        <div className="min-w-0 flex-1">
          <div className="text-sm font-black text-chalk">Install FAI on this phone</div>
          <p className="mt-1 text-xs leading-relaxed text-muted">
            {isIos
              ? 'Tap Share, then Add to Home Screen. FAI will launch like an app.'
              : 'Add FAI to your home screen for full-screen access and offline use.'}
          </p>
        </div>
        <button
          type="button"
          onClick={dismiss}
          className="rounded-lg px-2 py-1 text-sm text-muted hover:bg-panel-2 hover:text-chalk"
          aria-label="Dismiss install message"
        >
          ×
        </button>
      </div>
      {installPrompt && (
        <button
          type="button"
          onClick={() => void install()}
          className="mt-3 w-full rounded-xl bg-fai px-4 py-2.5 text-sm font-black text-ink"
        >
          Install FAI
        </button>
      )}
      <p className="mt-2 text-[10px] leading-relaxed text-muted">
        FAI is local-first. Use Data → Export All Data for a portable backup.
      </p>
    </div>
  )
}

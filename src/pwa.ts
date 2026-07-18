export const PWA_UPDATE_EVENT = 'fai:pwa-update'

export function registerFaiPwa(): void {
  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return

  window.addEventListener('load', () => {
    void navigator.serviceWorker
      .register('./sw.js')
      .then((registration) => {
        if (registration.waiting) {
          window.dispatchEvent(
            new CustomEvent(PWA_UPDATE_EVENT, { detail: registration }),
          )
        }

        registration.addEventListener('updatefound', () => {
          const installing = registration.installing
          if (!installing) return
          installing.addEventListener('statechange', () => {
            if (installing.state === 'installed' && navigator.serviceWorker.controller) {
              window.dispatchEvent(
                new CustomEvent(PWA_UPDATE_EVENT, { detail: registration }),
              )
            }
          })
        })
      })
      .catch((error: unknown) => {
        console.warn('[FAI PWA] Service worker registration failed.', error)
      })
  })
}

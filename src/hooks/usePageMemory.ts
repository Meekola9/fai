import { useEffect, useLayoutEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react'

function resolveInitial<T>(initial: T | (() => T)): T {
  return typeof initial === 'function' ? (initial as () => T)() : initial
}

function readStored<T>(key: string, initial: T | (() => T)): T {
  const fallback = resolveInitial(initial)
  if (typeof window === 'undefined') return fallback
  try {
    const raw = window.sessionStorage.getItem(key)
    return raw ? JSON.parse(raw) as T : fallback
  } catch {
    return fallback
  }
}

/** Keep page controls stable while navigating away and back during the current browser session. */
export function usePageMemory<T>(
  key: string,
  initial: T | (() => T),
): [T, Dispatch<SetStateAction<T>>] {
  const [value, setValue] = useState<T>(() => readStored(key, initial))

  useEffect(() => {
    try {
      window.sessionStorage.setItem(key, JSON.stringify(value))
    } catch {
      // The page still works when browser storage is blocked.
    }
  }, [key, value])

  return [value, setValue]
}

/** Restore the page to the same vertical position after opening a profile and returning. */
export function usePageScrollMemory(key: string): void {
  const restored = useRef(false)

  useLayoutEffect(() => {
    if (restored.current || typeof window === 'undefined') return
    restored.current = true
    try {
      const raw = window.sessionStorage.getItem(key)
      const top = raw ? Number(raw) : 0
      if (Number.isFinite(top) && top > 0) {
        window.requestAnimationFrame(() => window.scrollTo({ top, behavior: 'auto' }))
      }
    } catch {
      // Ignore unavailable session storage.
    }
  }, [key])

  useEffect(() => {
    const save = () => {
      try {
        window.sessionStorage.setItem(key, String(window.scrollY))
      } catch {
        // Ignore unavailable session storage.
      }
    }
    window.addEventListener('pagehide', save)
    return () => {
      save()
      window.removeEventListener('pagehide', save)
    }
  }, [key])
}

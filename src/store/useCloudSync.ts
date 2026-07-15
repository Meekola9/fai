import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { RealtimeChannel } from '@supabase/supabase-js'
import type { AppData, Athlete, TestSession, TestingEvent } from '../types'
import { historicalSeedData, mergeHistoricalData } from '../data/historicalSeed'
import { consolidateAthleteAliases } from '../lib/athleteIdentity'
import {
  coalesceMutations,
  enqueueCloudMutation,
  mutationsForTeam,
  overlayCloudQueue,
  readCloudQueue,
  removeCloudMutation,
  writeCloudQueue,
} from './cloudQueue'
import type {
  CloudConflict,
  CloudEntity,
  CloudMutation,
  CloudRecordVersion,
  CloudSyncStatus,
  CloudTeam,
  CloudUser,
  TeamRole,
} from './cloudTypes'
import {
  applyCloudMutation,
  createCloudInvite,
  createCloudTeam,
  currentCloudUser,
  isCloudConfigured,
  joinCloudTeam,
  listCloudTeams,
  loadCloudSnapshot,
  onCloudAuthChange,
  sendMagicLink,
  signOutCloud,
  subscribeCloudTeam,
} from './supabaseCloud'

const ACTIVE_TEAM_KEY = 'fai:cloud:active-team:v1'
const PRE_MIGRATION_PREFIX = 'fai:cloud:pre-migration:v1:'

function uid(prefix: string): string {
  const random = globalThis.crypto?.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`
  return `${prefix}-${random}`
}

function versionKey(entity: CloudEntity, id: string): string {
  return `${entity}:${id}`
}

function dataIsEmpty(data: Required<AppData>): boolean {
  return data.athletes.length === 0 && data.events.length === 0 && data.sessions.length === 0
}

function allRecords(data: Required<AppData>): Array<{
  entity: CloudEntity
  record: Athlete | TestingEvent | TestSession
}> {
  return [
    ...data.athletes.map((record) => ({ entity: 'athlete' as const, record })),
    ...data.events.map((record) => ({ entity: 'event' as const, record })),
    ...data.sessions.map((record) => ({ entity: 'session' as const, record })),
  ]
}

function roleCanEdit(role: TeamRole | undefined): boolean {
  return role === 'owner' || role === 'admin' || role === 'coach'
}

export interface CloudSyncApi {
  configured: boolean
  user: CloudUser | null
  teams: CloudTeam[]
  activeTeam: CloudTeam | null
  status: CloudSyncStatus
  conflicts: CloudConflict[]
  authMessage: string
  canEdit: boolean
  sendLink: (email: string) => Promise<void>
  signOut: () => Promise<void>
  createTeam: (name: string) => Promise<void>
  joinTeam: (token: string) => Promise<void>
  selectTeam: (teamId: string) => void
  createInvite: (role?: Exclude<TeamRole, 'owner'>) => Promise<string>
  queueUpsert: (entity: CloudEntity, record: Athlete | TestingEvent | TestSession) => void
  queueDelete: (entity: CloudEntity, recordId: string) => void
  queueDataset: (next: Required<AppData>, replace?: boolean) => void
  flush: () => Promise<void>
  refresh: () => Promise<void>
  keepMine: (conflictId: string) => void
  useCloud: (conflictId: string) => Promise<void>
}

export function useCloudSync(
  localData: Required<AppData>,
  replaceLocal: (next: Required<AppData>) => void,
  localReady = true,
): CloudSyncApi {
  const [user, setUser] = useState<CloudUser | null>(null)
  const [teams, setTeams] = useState<CloudTeam[]>([])
  const [activeTeamId, setActiveTeamId] = useState(() =>
    typeof localStorage === 'undefined' ? '' : localStorage.getItem(ACTIVE_TEAM_KEY) ?? '',
  )
  const [status, setStatus] = useState<CloudSyncStatus>(() => ({
    state: isCloudConfigured ? 'signed_out' : 'disabled',
    message: isCloudConfigured ? 'Sign in to enable cloud sync' : 'Cloud not configured · saved on this device',
    pending: 0,
    lastSyncedAt: null,
  }))
  const [conflicts, setConflicts] = useState<CloudConflict[]>([])
  const [authMessage, setAuthMessage] = useState('')

  const dataRef = useRef(localData)
  const userRef = useRef<CloudUser | null>(null)
  const teamsRef = useRef<CloudTeam[]>([])
  const activeTeamRef = useRef(activeTeamId)
  const conflictsRef = useRef<CloudConflict[]>([])
  const queueRef = useRef<CloudMutation[]>(readCloudQueue())
  const versionsRef = useRef(new Map<string, CloudRecordVersion>())
  const flushingRef = useRef(false)
  const channelRef = useRef<RealtimeChannel | null>(null)
  const refreshTimerRef = useRef<number | null>(null)

  useEffect(() => { dataRef.current = localData }, [localData])
  useEffect(() => { userRef.current = user }, [user])
  useEffect(() => { teamsRef.current = teams }, [teams])
  useEffect(() => { activeTeamRef.current = activeTeamId }, [activeTeamId])
  useEffect(() => { conflictsRef.current = conflicts }, [conflicts])

  const activeTeam = useMemo(
    () => teams.find((team) => team.id === activeTeamId) ?? null,
    [teams, activeTeamId],
  )
  const canEdit = roleCanEdit(activeTeam?.role)

  const updatePendingStatus = useCallback((state?: CloudSyncStatus['state'], message?: string) => {
    const teamId = activeTeamRef.current
    const pending = teamId ? mutationsForTeam(queueRef.current, teamId).length : 0
    setStatus((current) => ({
      state: state ?? current.state,
      message: message ?? current.message,
      pending,
      lastSyncedAt: current.lastSyncedAt,
    }))
  }, [])

  const updateVersions = useCallback((versions: CloudRecordVersion[]) => {
    versionsRef.current = new Map(versions.map((item) => [versionKey(item.entity, item.id), item]))
  }, [])

  const refreshTeams = useCallback(async (preferredTeamId?: string) => {
    if (!isCloudConfigured) return
    const next = await listCloudTeams()
    setTeams(next)
    teamsRef.current = next
    const saved = preferredTeamId || activeTeamRef.current
    const selected = next.some((team) => team.id === saved) ? saved : next[0]?.id ?? ''
    setActiveTeamId(selected)
    activeTeamRef.current = selected
    if (typeof localStorage !== 'undefined') {
      if (selected) localStorage.setItem(ACTIVE_TEAM_KEY, selected)
      else localStorage.removeItem(ACTIVE_TEAM_KEY)
    }
  }, [])

  const queueMutation = useCallback((input: Omit<CloudMutation, 'id' | 'createdAt' | 'attempts'>) => {
    const existing = queueRef.current.find(
      (item) => item.teamId === input.teamId && item.entity === input.entity && item.recordId === input.recordId,
    )
    const item: CloudMutation = {
      ...input,
      // Always use a new id. If an older mutation is already in flight, its
      // success must not remove this newer edit from the queue.
      id: uid('cloud'),
      expectedVersion: existing?.expectedVersion ?? input.expectedVersion,
      createdAt: Date.now(),
      attempts: existing?.attempts ?? 0,
    }
    queueRef.current = enqueueCloudMutation(queueRef.current, item)
    writeCloudQueue(queueRef.current)
    const pending = mutationsForTeam(queueRef.current, input.teamId).length
    const online = typeof navigator === 'undefined' || navigator.onLine
    setStatus((current) => ({
      state: online ? 'saving' : 'offline',
      message: online ? `Saving ${pending} cloud change${pending === 1 ? '' : 's'}…` : `${pending} change${pending === 1 ? '' : 's'} queued offline`,
      pending,
      lastSyncedAt: current.lastSyncedAt,
    }))
  }, [])

  const flush = useCallback(async () => {
    if (!isCloudConfigured || !userRef.current || flushingRef.current) return
    const teamId = activeTeamRef.current
    if (!teamId) return
    const online = typeof navigator === 'undefined' || navigator.onLine
    if (!online) {
      updatePendingStatus('offline', 'Offline · changes remain queued on this device')
      return
    }

    flushingRef.current = true
    let encounteredConflict = false
    try {
      while (true) {
        const next = mutationsForTeam(queueRef.current, teamId)[0]
        if (!next) break
        updatePendingStatus('saving', 'Saving queued changes…')
        const result = await applyCloudMutation(next)
        const currentForRecord = queueRef.current.find(
          (item) => item.teamId === next.teamId && item.entity === next.entity && item.recordId === next.recordId,
        )

        if (result.conflict) {
          encounteredConflict = true
          queueRef.current = removeCloudMutation(queueRef.current, next.id)
          writeCloudQueue(queueRef.current)
          const conflict: CloudConflict = {
            mutation: next,
            remoteVersion: result.remoteVersion ?? null,
            remoteRecord: result.remoteRecord,
            detectedAt: Date.now(),
          }
          conflictsRef.current = [
            ...conflictsRef.current.filter((item) => item.mutation.id !== next.id),
            conflict,
          ]
          setConflicts(conflictsRef.current)
          updatePendingStatus('conflict', `Cloud conflict on ${next.entity} ${next.recordId}`)
          continue
        }

        if (!result.ok) {
          queueRef.current = queueRef.current.map((item) =>
            item.id === next.id
              ? { ...item, attempts: item.attempts + 1, lastError: result.error ?? 'Cloud save failed' }
              : item,
          )
          writeCloudQueue(queueRef.current)
          updatePendingStatus('error', result.error ?? 'Cloud save failed')
          return
        }

        const newVersion = result.version ?? 1
        versionsRef.current.set(versionKey(next.entity, next.recordId), {
          entity: next.entity,
          id: next.recordId,
          version: newVersion,
          updatedAt: result.updatedAt ?? new Date().toISOString(),
        })

        // A newer edit may have replaced this mutation while the request was in
        // flight. Advance that edit to the version just accepted by the server.
        if (currentForRecord && currentForRecord.id !== next.id) {
          queueRef.current = queueRef.current.map((item) =>
            item.id === currentForRecord.id ? { ...item, expectedVersion: newVersion } : item,
          )
        } else {
          queueRef.current = removeCloudMutation(queueRef.current, next.id)
        }
        writeCloudQueue(queueRef.current)
      }

      const hasConflicts = encounteredConflict || conflictsRef.current.length > 0
      setStatus({
        state: hasConflicts ? 'conflict' : 'synced',
        message: hasConflicts ? 'Cloud conflicts need review' : 'Cloud synced',
        pending: mutationsForTeam(queueRef.current, teamId).length,
        lastSyncedAt: Date.now(),
      })
    } finally {
      flushingRef.current = false
    }
  }, [updatePendingStatus])

  const queueUpsert = useCallback((entity: CloudEntity, record: Athlete | TestingEvent | TestSession) => {
    const teamId = activeTeamRef.current
    const team = teamsRef.current.find((item) => item.id === teamId)
    if (!userRef.current || !teamId || !roleCanEdit(team?.role)) return
    queueMutation({
      teamId,
      entity,
      operation: 'upsert',
      recordId: record.id,
      payload: record,
      expectedVersion: versionsRef.current.get(versionKey(entity, record.id))?.version ?? null,
    })
    window.setTimeout(() => void flush(), 0)
  }, [flush, queueMutation])

  const queueDelete = useCallback((entity: CloudEntity, recordId: string) => {
    const teamId = activeTeamRef.current
    const team = teamsRef.current.find((item) => item.id === teamId)
    if (!userRef.current || !teamId || !roleCanEdit(team?.role)) return
    queueMutation({
      teamId,
      entity,
      operation: 'delete',
      recordId,
      expectedVersion: versionsRef.current.get(versionKey(entity, recordId))?.version ?? null,
    })
    window.setTimeout(() => void flush(), 0)
  }, [flush, queueMutation])

  const queueDataset = useCallback((next: Required<AppData>, replace = false) => {
    const teamId = activeTeamRef.current
    const team = teamsRef.current.find((item) => item.id === teamId)
    if (!userRef.current || !teamId || !roleCanEdit(team?.role)) return
    const clean = consolidateAthleteAliases(next)

    if (replace) {
      const desired = {
        athlete: new Set(clean.athletes.map((item) => item.id)),
        event: new Set(clean.events.map((item) => item.id)),
        session: new Set(clean.sessions.map((item) => item.id)),
      }
      for (const [key, version] of versionsRef.current) {
        const separator = key.indexOf(':')
        const entity = key.slice(0, separator) as CloudEntity
        const id = key.slice(separator + 1)
        if (!desired[entity].has(id)) {
          queueMutation({ teamId, entity, operation: 'delete', recordId: id, expectedVersion: version.version })
        }
      }
    }

    let timestamp = Date.now()
    for (const { entity, record } of allRecords(clean)) {
      const existing = queueRef.current.find(
        (item) => item.teamId === teamId && item.entity === entity && item.recordId === record.id,
      )
      queueRef.current = enqueueCloudMutation(queueRef.current, {
        id: uid('cloud'),
        teamId,
        entity,
        operation: 'upsert',
        recordId: record.id,
        payload: record,
        expectedVersion: existing?.expectedVersion ?? versionsRef.current.get(versionKey(entity, record.id))?.version ?? null,
        createdAt: timestamp++,
        attempts: existing?.attempts ?? 0,
      })
    }
    writeCloudQueue(queueRef.current)
    const online = typeof navigator === 'undefined' || navigator.onLine
    updatePendingStatus(online ? 'saving' : 'offline', 'Preparing team data for cloud sync…')
    window.setTimeout(() => void flush(), 0)
  }, [flush, queueMutation, updatePendingStatus])

  const refresh = useCallback(async () => {
    const teamId = activeTeamRef.current
    if (!userRef.current || !teamId || !localReady) return
    setStatus((current) => ({ ...current, state: 'connecting', message: 'Refreshing team data…' }))
    const snapshot = await loadCloudSnapshot(teamId)
    updateVersions(snapshot.versions)
    const baseline = await historicalSeedData()
    const cloudWithBaseline = mergeHistoricalData(baseline, snapshot.data)
    const withQueued = overlayCloudQueue(cloudWithBaseline, queueRef.current, teamId)
    replaceLocal(consolidateAthleteAliases(withQueued))
    const pending = mutationsForTeam(queueRef.current, teamId).length
    const online = typeof navigator === 'undefined' || navigator.onLine
    setStatus({
      state: pending ? (online ? 'saving' : 'offline') : (conflictsRef.current.length ? 'conflict' : 'synced'),
      message: pending ? `${pending} local change${pending === 1 ? '' : 's'} pending` : (conflictsRef.current.length ? 'Cloud conflicts need review' : 'Cloud synced'),
      pending,
      lastSyncedAt: Date.now(),
    })
  }, [localReady, replaceLocal, updateVersions])

  const connectTeam = useCallback(async (teamId: string) => {
    if (!userRef.current || !teamId || !localReady) return
    setStatus({
      state: 'connecting',
      message: 'Connecting to team cloud…',
      pending: mutationsForTeam(queueRef.current, teamId).length,
      lastSyncedAt: null,
    })

    const snapshot = await loadCloudSnapshot(teamId)
    updateVersions(snapshot.versions)

    if (dataIsEmpty(snapshot.data)) {
      const local = consolidateAthleteAliases(dataRef.current)
      // Preserve a recoverable copy before the first cloud migration.
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(`${PRE_MIGRATION_PREFIX}${teamId}`, JSON.stringify(local))
      }
      replaceLocal(local)
      const team = teamsRef.current.find((item) => item.id === teamId)
      if (roleCanEdit(team?.role)) {
        let timestamp = Date.now()
        for (const { entity, record } of allRecords(local)) {
          queueRef.current = enqueueCloudMutation(queueRef.current, {
            id: uid('cloud'),
            teamId,
            entity,
            operation: 'upsert',
            recordId: record.id,
            payload: record,
            expectedVersion: null,
            createdAt: timestamp++,
            attempts: 0,
          })
        }
        writeCloudQueue(queueRef.current)
        updatePendingStatus('saving', 'Uploading this device’s FAI history…')
        await flush()
      }
    } else {
      const baseline = await historicalSeedData()
      const cloudWithBaseline = mergeHistoricalData(baseline, snapshot.data)
      replaceLocal(consolidateAthleteAliases(overlayCloudQueue(cloudWithBaseline, queueRef.current, teamId)))
      await flush()
      if (mutationsForTeam(queueRef.current, teamId).length === 0 && conflictsRef.current.length === 0) {
        setStatus({ state: 'synced', message: 'Cloud synced', pending: 0, lastSyncedAt: Date.now() })
      }
    }

    if (channelRef.current) void channelRef.current.unsubscribe()
    channelRef.current = subscribeCloudTeam(teamId, () => {
      if (refreshTimerRef.current) window.clearTimeout(refreshTimerRef.current)
      refreshTimerRef.current = window.setTimeout(() => {
        if (mutationsForTeam(queueRef.current, teamId).length === 0) void refresh()
      }, 350)
    })
  }, [flush, localReady, refresh, replaceLocal, updatePendingStatus, updateVersions])

  useEffect(() => {
    if (!isCloudConfigured) return
    let alive = true
    currentCloudUser()
      .then(async (nextUser) => {
        if (!alive) return
        userRef.current = nextUser
        setUser(nextUser)
        if (nextUser) await refreshTeams()
      })
      .catch((error: unknown) => {
        if (!alive) return
        setStatus({
          state: 'error',
          message: error instanceof Error ? error.message : 'Cloud authentication failed',
          pending: 0,
          lastSyncedAt: null,
        })
      })

    const unsubscribe = onCloudAuthChange((_event, nextUser) => {
      userRef.current = nextUser
      setUser(nextUser)
      setAuthMessage('')
      if (nextUser) void refreshTeams()
      else {
        setTeams([])
        teamsRef.current = []
        setActiveTeamId('')
        activeTeamRef.current = ''
        setStatus({ state: 'signed_out', message: 'Sign in to enable cloud sync', pending: 0, lastSyncedAt: null })
      }
    })

    return () => {
      alive = false
      unsubscribe()
    }
  }, [refreshTeams])

  useEffect(() => {
    if (!localReady || !user || !activeTeamId) return
    void connectTeam(activeTeamId).catch((error: unknown) => {
      setStatus({
        state: 'error',
        message: error instanceof Error ? error.message : 'Could not connect to team cloud',
        pending: mutationsForTeam(queueRef.current, activeTeamId).length,
        lastSyncedAt: null,
      })
    })
    return () => {
      if (channelRef.current) void channelRef.current.unsubscribe()
      channelRef.current = null
    }
  }, [activeTeamId, connectTeam, localReady, user])

  useEffect(() => {
    if (!user || !activeTeamId) return
    const retry = () => void flush()
    window.addEventListener('online', retry)
    const timer = window.setInterval(retry, 30_000)
    return () => {
      window.removeEventListener('online', retry)
      window.clearInterval(timer)
    }
  }, [activeTeamId, flush, user])

  const sendLink = useCallback(async (email: string) => {
    setAuthMessage('Sending secure sign-in link…')
    await sendMagicLink(email)
    setAuthMessage('Check your email for the FAI sign-in link.')
  }, [])

  const signOut = useCallback(async () => {
    if (channelRef.current) void channelRef.current.unsubscribe()
    await signOutCloud()
  }, [])

  const createTeam = useCallback(async (name: string) => {
    const teamId = await createCloudTeam(name)
    await refreshTeams(teamId)
  }, [refreshTeams])

  const joinTeam = useCallback(async (token: string) => {
    const teamId = await joinCloudTeam(token)
    await refreshTeams(teamId)
  }, [refreshTeams])

  const selectTeam = useCallback((teamId: string) => {
    setActiveTeamId(teamId)
    activeTeamRef.current = teamId
    if (typeof localStorage !== 'undefined') localStorage.setItem(ACTIVE_TEAM_KEY, teamId)
  }, [])

  const createInvite = useCallback(async (role: Exclude<TeamRole, 'owner'> = 'coach') => {
    const teamId = activeTeamRef.current
    if (!teamId) throw new Error('Select a team first.')
    return createCloudInvite(teamId, role)
  }, [])

  const keepMine = useCallback((conflictId: string) => {
    const conflict = conflictsRef.current.find((item) => item.mutation.id === conflictId)
    if (!conflict) return
    queueRef.current = coalesceMutations([
      ...queueRef.current,
      {
        ...conflict.mutation,
        id: uid('cloud'),
        expectedVersion: conflict.remoteVersion,
        attempts: 0,
        createdAt: Date.now(),
      },
    ])
    writeCloudQueue(queueRef.current)
    conflictsRef.current = conflictsRef.current.filter((item) => item.mutation.id !== conflictId)
    setConflicts(conflictsRef.current)
    window.setTimeout(() => void flush(), 0)
  }, [flush])

  const useCloud = useCallback(async (conflictId: string) => {
    conflictsRef.current = conflictsRef.current.filter((item) => item.mutation.id !== conflictId)
    setConflicts(conflictsRef.current)
    await refresh()
  }, [refresh])

  return {
    configured: isCloudConfigured,
    user,
    teams,
    activeTeam,
    status,
    conflicts,
    authMessage,
    canEdit,
    sendLink,
    signOut,
    createTeam,
    joinTeam,
    selectTeam,
    createInvite,
    queueUpsert,
    queueDelete,
    queueDataset,
    flush,
    refresh,
    keepMine,
    useCloud,
  }
}

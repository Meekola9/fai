import type { AppData, Athlete, TestSession, TestingEvent } from '../types'
import type { CloudEntity, CloudMutation } from './cloudTypes'

const QUEUE_KEY = 'fai:cloud:queue:v1'

function mutationKey(item: Pick<CloudMutation, 'teamId' | 'entity' | 'recordId'>): string {
  return `${item.teamId}:${item.entity}:${item.recordId}`
}

export function coalesceMutations(items: CloudMutation[]): CloudMutation[] {
  const byRecord = new Map<string, CloudMutation>()
  for (const item of items) byRecord.set(mutationKey(item), item)
  return [...byRecord.values()].sort((a, b) => a.createdAt - b.createdAt)
}

export function readCloudQueue(): CloudMutation[] {
  if (typeof localStorage === 'undefined') return []
  try {
    const raw = localStorage.getItem(QUEUE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as CloudMutation[]
    return Array.isArray(parsed) ? coalesceMutations(parsed.filter(Boolean)) : []
  } catch {
    return []
  }
}

export function writeCloudQueue(items: CloudMutation[]): void {
  if (typeof localStorage === 'undefined') return
  const next = coalesceMutations(items)
  if (next.length === 0) localStorage.removeItem(QUEUE_KEY)
  else localStorage.setItem(QUEUE_KEY, JSON.stringify(next))
}

export function enqueueCloudMutation(queue: CloudMutation[], item: CloudMutation): CloudMutation[] {
  return coalesceMutations([...queue, item])
}

export function removeCloudMutation(queue: CloudMutation[], id: string): CloudMutation[] {
  return queue.filter((item) => item.id !== id)
}

export function mutationsForTeam(queue: CloudMutation[], teamId: string): CloudMutation[] {
  return queue.filter((item) => item.teamId === teamId)
}

function recordsFor(entity: CloudEntity, data: Required<AppData>): Array<Athlete | TestingEvent | TestSession> {
  if (entity === 'athlete') return data.athletes
  if (entity === 'event') return data.events
  return data.sessions
}

export function overlayCloudQueue(base: Required<AppData>, queue: CloudMutation[], teamId: string): Required<AppData> {
  const next: Required<AppData> = {
    athletes: [...base.athletes],
    events: [...base.events],
    sessions: [...base.sessions],
  }

  for (const entity of ['athlete', 'event', 'session'] as const) {
    const map = new Map(recordsFor(entity, next).map((record) => [record.id, record]))
    for (const mutation of queue) {
      if (mutation.teamId !== teamId || mutation.entity !== entity) continue
      if (mutation.operation === 'delete') map.delete(mutation.recordId)
      else if (mutation.payload) map.set(mutation.recordId, mutation.payload)
    }
    if (entity === 'athlete') next.athletes = [...map.values()] as Athlete[]
    if (entity === 'event') next.events = [...map.values()] as TestingEvent[]
    if (entity === 'session') next.sessions = [...map.values()] as TestSession[]
  }

  return next
}

import type { AppData, Athlete, TestSession, TestingEvent } from '../types'

export type TeamRole = 'owner' | 'admin' | 'coach' | 'viewer'
export type CloudEntity = 'athlete' | 'event' | 'session'
export type CloudOperation = 'upsert' | 'delete'

export interface CloudTeam {
  id: string
  name: string
  slug: string
  role: TeamRole
  createdAt: string
}

export interface CloudUser {
  id: string
  email: string
}

export interface CloudRecordVersion {
  entity: CloudEntity
  id: string
  version: number
  updatedAt: string
}

export interface CloudMutation {
  id: string
  teamId: string
  entity: CloudEntity
  operation: CloudOperation
  recordId: string
  payload?: Athlete | TestingEvent | TestSession
  expectedVersion: number | null
  createdAt: number
  attempts: number
  lastError?: string
}

export interface CloudConflict {
  mutation: CloudMutation
  remoteVersion: number | null
  remoteRecord?: Athlete | TestingEvent | TestSession
  detectedAt: number
}

export type CloudSyncState =
  | 'disabled'
  | 'signed_out'
  | 'connecting'
  | 'local'
  | 'saving'
  | 'synced'
  | 'offline'
  | 'conflict'
  | 'error'

export interface CloudSyncStatus {
  state: CloudSyncState
  message: string
  pending: number
  lastSyncedAt: number | null
}

export interface CloudSnapshot {
  data: Required<AppData>
  versions: CloudRecordVersion[]
}

export interface MutationResult {
  ok: boolean
  version?: number
  updatedAt?: string
  conflict?: boolean
  remoteVersion?: number | null
  remoteRecord?: Athlete | TestingEvent | TestSession
  error?: string
}

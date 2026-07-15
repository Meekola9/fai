import type { AppData } from '../types'
import { cloudClient } from './supabaseCloud'

export interface CloudBootstrapResult {
  athletes: number
  events: number
  sessions: number
}

export async function bootstrapCloudTeam(
  teamId: string,
  snapshot: Required<AppData>,
): Promise<CloudBootstrapResult> {
  const client = cloudClient()
  if (!client) throw new Error('Cloud sync is not configured.')
  const { data, error } = await client.rpc('import_fai_snapshot', {
    p_team_id: teamId,
    p_snapshot: snapshot,
  })
  if (error) throw error
  if (!data || typeof data !== 'object') {
    throw new Error('Cloud bootstrap returned an invalid response.')
  }
  const result = data as Record<string, unknown>
  if (result.ok !== true) {
    throw new Error(typeof result.error === 'string' ? result.error : 'Cloud bootstrap failed.')
  }
  return {
    athletes: Number(result.athletes ?? 0),
    events: Number(result.events ?? 0),
    sessions: Number(result.sessions ?? 0),
  }
}

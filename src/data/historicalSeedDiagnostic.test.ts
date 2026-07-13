import { writeFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { historicalSeedData } from './historicalSeed'

describe('historical seed diagnostic', () => {
  it('records decoder failures for CI inspection', async () => {
    try {
      const data = await historicalSeedData()
      writeFileSync(
        'seed-diagnostic.txt',
        JSON.stringify({ ok: true, athletes: data.athletes.length, events: data.events.length, sessions: data.sessions.length }),
      )
      expect(data).toBeDefined()
    } catch (error) {
      const message = error instanceof Error ? `${error.name}: ${error.message}\n${error.stack ?? ''}` : String(error)
      writeFileSync('seed-diagnostic.txt', message)
      throw error
    }
  })
})

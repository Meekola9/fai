import { describe, expect, it } from 'vitest'
import { LatestSaveQueue } from './latestSaveQueue'

function deferred() {
  let resolve!: () => void
  const promise = new Promise<void>((done) => {
    resolve = done
  })
  return { promise, resolve }
}

async function nextTurn(): Promise<void> {
  await Promise.resolve()
  await Promise.resolve()
}

describe('LatestSaveQueue', () => {
  it('never runs snapshot saves in parallel and finishes with the newest state', async () => {
    const first = deferred()
    const latest = deferred()
    const started: string[][] = []
    const saved: string[][] = []
    let active = 0
    let maxActive = 0

    const queue = new LatestSaveQueue<string[]>(
      async (snapshot) => {
        active += 1
        maxActive = Math.max(maxActive, active)
        started.push(snapshot)
        await (snapshot.includes('vertical') ? latest.promise : first.promise)
        active -= 1
      },
      {
        onSaved: (snapshot) => saved.push(snapshot),
      },
    )

    queue.enqueue(['bench'])
    await nextTurn()
    queue.enqueue(['bench', 'squat'])
    queue.enqueue(['bench', 'squat', 'vertical'])

    expect(started).toEqual([['bench']])
    expect(maxActive).toBe(1)

    first.resolve()
    await nextTurn()

    expect(started).toEqual([
      ['bench'],
      ['bench', 'squat', 'vertical'],
    ])
    expect(maxActive).toBe(1)
    expect(saved).toEqual([])

    latest.resolve()
    await nextTurn()

    expect(saved).toEqual([['bench', 'squat', 'vertical']])
    expect(maxActive).toBe(1)
  })
})

export interface LatestSaveQueueCallbacks<T> {
  onQueued?: (value: T) => void
  onSaved?: (value: T) => void
  onError?: (error: unknown, value: T) => void
}

/**
 * Serializes persistence work and keeps only the newest waiting snapshot.
 *
 * FAI saves a complete team snapshot. Running two snapshot saves in parallel can
 * let an older save finish last and prune rows that were added by the newer
 * save. This queue guarantees one writer at a time and coalesces rapid edits so
 * the newest state is always the final state written.
 */
export class LatestSaveQueue<T> {
  private pending: T | undefined
  private running = false
  private readonly worker: (value: T) => Promise<void>
  private readonly callbacks: LatestSaveQueueCallbacks<T>

  constructor(
    worker: (value: T) => Promise<void>,
    callbacks: LatestSaveQueueCallbacks<T> = {},
  ) {
    this.worker = worker
    this.callbacks = callbacks
  }

  enqueue(value: T): void {
    this.pending = value
    this.callbacks.onQueued?.(value)
    this.start()
  }

  private start(): void {
    if (this.running) return
    this.running = true

    void this.drain().finally(() => {
      this.running = false
      // Defensive restart in case a value was queued during promise cleanup.
      if (this.pending !== undefined) this.start()
    })
  }

  private async drain(): Promise<void> {
    while (this.pending !== undefined) {
      const value = this.pending
      this.pending = undefined

      try {
        await this.worker(value)
        // Do not flash "saved" for an obsolete snapshot when a newer one waits.
        if (this.pending === undefined) this.callbacks.onSaved?.(value)
      } catch (error: unknown) {
        // Continue to the newest queued snapshot after an older save failure.
        if (this.pending === undefined) this.callbacks.onError?.(error, value)
      }
    }
  }
}

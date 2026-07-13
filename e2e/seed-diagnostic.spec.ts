import { writeFileSync } from 'node:fs'
import { test } from '@playwright/test'

test('capture fresh browser seed state', async ({ page }) => {
  const errors: string[] = []
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(`console: ${message.text()}`)
  })
  page.on('pageerror', (error) => errors.push(`pageerror: ${error.message}`))
  await page.addInitScript(() => {
    localStorage.removeItem('fai:data:v1')
    localStorage.removeItem('fai:data:v2')
    localStorage.removeItem('fai:cloud:queue:v1')
    localStorage.removeItem('fai:cloud:active-team:v1')
  })
  await page.goto('/')
  await page.waitForTimeout(5000)
  const state = await page.evaluate(() => {
    const raw = localStorage.getItem('fai:data:v2')
    const parsed = raw ? JSON.parse(raw) as { athletes?: unknown[]; events?: unknown[]; sessions?: unknown[] } : null
    return {
      body: document.body.innerText.slice(0, 2000),
      hasStoredData: Boolean(raw),
      athletes: parsed?.athletes?.length ?? null,
      events: parsed?.events?.length ?? null,
      sessions: parsed?.sessions?.length ?? null,
    }
  })
  writeFileSync('browser-seed-diagnostic.json', JSON.stringify({ state, errors }, null, 2))
})

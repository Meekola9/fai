import { expect, test } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.removeItem('fai:data:v1')
    localStorage.removeItem('fai:data:v2')
    localStorage.removeItem('fai:vertical-benchmark-mode')
  })
})

test('vertical standards show position bands and switch comparison context', async ({ page }) => {
  await page.goto('/#/vertical')

  await expect(page.getByRole('heading', { name: 'Vertical Jump Benchmarks', exact: true })).toBeVisible()
  await expect(page.getByText('Skill standard', { exact: true })).toBeVisible()
  await expect(page.getByText('Hybrid standard', { exact: true })).toBeVisible()
  await expect(page.getByText('Line standard', { exact: true })).toBeVisible()

  await expect(page.getByText('35+ inches', { exact: true })).toBeVisible()
  await expect(page.getByText('30–34.9 inches', { exact: true })).toBeVisible()
  await expect(page.getByText('24–26.9 inches', { exact: true })).toBeVisible()
  await expect(page.getByText('21–23.9 inches', { exact: true })).toBeVisible()

  await page.getByRole('button', { name: 'Georgia HS', exact: true }).click()
  await expect(page.getByText('36+ inches', { exact: true })).toBeVisible()
  await expect(page.getByText(/not an official GHSA percentile dataset/i)).toBeVisible()

  await page.getByRole('button', { name: 'NCAA Projection', exact: true }).click()
  await expect(page.getByText('38+ inches', { exact: true })).toBeVisible()
  await expect(page.getByText(/not an NCAA eligibility rule/i)).toBeVisible()

  const stored = await page.evaluate(() => localStorage.getItem('fai:vertical-benchmark-mode'))
  expect(stored).toBe('ncaa-recruiting')
})

import { test, expect } from '@playwright/test'

test('take the awareness quiz and see a score', async ({ page }) => {
  await page.goto('/#/quiz')
  await expect(page.getByRole('heading', { name: /Football Awareness Quiz/ })).toBeVisible({ timeout: 15000 })

  // Answer every question by selecting its first option (one per question).
  const firstOptions = page.getByTestId('quiz-first-option')
  const count = await firstOptions.count()
  expect(count).toBe(15)
  for (let i = 0; i < count; i += 1) {
    await firstOptions.nth(i).click()
  }

  const submit = page.getByTestId('quiz-submit')
  await expect(submit).toBeEnabled()
  await submit.click()

  // Result screen shows the awareness score and a review section.
  await expect(page.getByText('Awareness Score')).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Review' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Retake quiz' })).toBeVisible()
})

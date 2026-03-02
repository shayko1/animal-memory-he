import { test, expect } from '@playwright/test'

test('loads and can start a new game', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'משחק זיכרון: חיות' })).toBeVisible()

  await page.getByRole('button', { name: 'משחק חדש' }).click()

  // ensure some tiles exist
  const tiles = page.getByRole('gridcell')
  await expect(tiles).toHaveCount(16)

  // tiles should be disabled during preview, so first click won't count as a move
  const moves = page.getByLabel('מהלכים')
  const movesTextBefore = await moves.innerText()
  await tiles.nth(0).click()
  await expect(moves).toHaveText(movesTextBefore)

  // wait for preview to end then flip two tiles
  await expect(tiles.first()).toBeEnabled({ timeout: 5000 })
  await tiles.nth(0).click()
  await tiles.nth(1).click()

  await expect(page.getByLabel('מהלכים')).toBeVisible()
})

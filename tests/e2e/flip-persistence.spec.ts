import { test, expect } from '@playwright/test'

test('first flipped card stays face-up until second card is chosen', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'משחק חדש' }).click()

  const tiles = page.getByRole('gridcell')
  await expect(tiles).toHaveCount(16)

  // Wait for preview to end (tiles become enabled AND status text changes)
  await expect(tiles.first()).toBeEnabled({ timeout: 5000 })
  await expect(page.getByText('תצוגה מקדימה…')).toHaveCount(0, { timeout: 5000 })

  const first = tiles.nth(0)
  await first.click()

  // Should remain face-up after click
  await expect(first).toHaveAttribute('data-state', 'faceUp')

  // And the front should show something visible (emoji exists and isn't empty)
  await expect(first.locator('.emoji')).toBeVisible()
  await expect(first.locator('.emoji')).not.toHaveText('')

  // Should not auto-flip back quickly (within 1s)
  await page.waitForTimeout(900)
  await expect(first).toHaveAttribute('data-state', 'faceUp')
})

test('mismatch stays face-up briefly then flips back', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'משחק חדש' }).click()

  const tiles = page.getByRole('gridcell')
  await expect(tiles.first()).toBeEnabled({ timeout: 5000 })

  // Find a mismatch pair by clicking until two face-up tiles have different labels
  const findMismatch = async () => {
    for (let i = 0; i < 16; i++) {
      for (let j = i + 1; j < 16; j++) {
        const a = tiles.nth(i)
        const b = tiles.nth(j)

        await a.click()
        await b.click()

        const aLabel = await a.getAttribute('aria-label')
        const bLabel = await b.getAttribute('aria-label')

        // mismatch if both are open but different
        if (aLabel && bLabel && aLabel.startsWith('פתוח:') && bLabel.startsWith('פתוח:') && aLabel !== bLabel) {
          return { a, b }
        }

        // otherwise reset board state by starting new game and wait for preview end
        await page.getByRole('button', { name: 'משחק חדש' }).click()
        await expect(tiles.first()).toBeEnabled({ timeout: 5000 })
      }
    }
    throw new Error('Could not find a mismatch pair')
  }

  const { a, b } = await findMismatch()

  // Immediately after mismatch both should be face-up
  await expect(a).toHaveAttribute('data-state', 'faceUp')
  await expect(b).toHaveAttribute('data-state', 'faceUp')

  // They should remain face-up for a short moment (animation/feedback window)
  await page.waitForTimeout(300)
  await expect(a).toHaveAttribute('data-state', 'faceUp')
  await expect(b).toHaveAttribute('data-state', 'faceUp')

  // Then flip back after the mismatch settle delay (~650ms)
  await page.waitForTimeout(600)
  await expect(a).toHaveAttribute('data-state', 'faceDown')
  await expect(b).toHaveAttribute('data-state', 'faceDown')
})

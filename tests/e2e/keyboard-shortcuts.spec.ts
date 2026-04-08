import { test, expect } from '@playwright/test'

test.describe('Keyboard Shortcuts', () => {
  test('/ focuses search input', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByTestId('search-input')).toBeVisible()

    await page.keyboard.press('/')
    await expect(page.getByTestId('search-input')).toBeFocused()
  })

  test('Esc dismisses search results without clearing query (input focused)', async ({ page }) => {
    await page.goto('/')
    const searchInput = page.getByTestId('search-input')

    // Type a query to trigger results
    await searchInput.click()
    await searchInput.fill('test')
    await expect(page.getByTestId('search-results')).toBeVisible({ timeout: 3000 })

    // Esc while input focused — should hide results, keep query
    await page.keyboard.press('Escape')
    await expect(page.getByTestId('search-results')).toBeHidden()
    await expect(searchInput).toHaveValue('test')
  })

  test('Esc dismisses search results globally (input NOT focused)', async ({ page }) => {
    await page.goto('/')
    const searchInput = page.getByTestId('search-input')

    // Type a query to trigger results
    await searchInput.click()
    await searchInput.fill('test')
    await expect(page.getByTestId('search-results')).toBeVisible({ timeout: 3000 })

    // Blur the input by pressing Tab (avoids triggering click-outside overlay)
    await page.keyboard.press('Tab')
    await expect(searchInput).not.toBeFocused()

    // Results should still be visible after Tab
    await expect(page.getByTestId('search-results')).toBeVisible()

    // Now press Esc globally — this exercises the new global handler
    await page.keyboard.press('Escape')
    await expect(page.getByTestId('search-results')).toBeHidden()
    await expect(searchInput).toHaveValue('test')
  })

  test('Esc closes mobile sidebar', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 812 })
    await page.goto('/')

    // Open mobile sidebar via hamburger menu
    await expect(page.getByTestId('mobile-menu-button')).toBeVisible()
    await page.getByTestId('mobile-menu-button').click()

    // Sidebar overlay should be visible
    await expect(page.getByTestId('mobile-sidebar-overlay')).toBeVisible()

    // Press Esc — should close sidebar
    await page.keyboard.press('Escape')
    await expect(page.getByTestId('mobile-sidebar-overlay')).toBeHidden()
  })
})

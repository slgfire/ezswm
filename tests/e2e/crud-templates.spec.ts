import { test, expect } from '@playwright/test'

test.describe('Layout Template CRUD', () => {
  test('create and list template', async ({ page, context }) => {
    // Create via API using Playwright request context (sends cookies)
    const response = await context.request.post('http://localhost:3000/api/layout-templates', {
      data: {
        name: 'Cisco 2960-24T',
        manufacturer: 'Cisco',
        model: '2960-24T',
        units: [{
          unit_number: 1,
          label: 'Unit 1',
          blocks: [{ type: 'rj45', count: 24, start_index: 1, rows: 2, label: 'Gi' }]
        }]
      }
    })
    expect(response.status()).toBe(201)

    // Verify it appears in the list
    await page.goto('/layout-templates')
    await page.waitForTimeout(2000)
    await expect(page.locator('main')).toContainText('Cisco 2960-24T', { timeout: 5000 })
  })
})

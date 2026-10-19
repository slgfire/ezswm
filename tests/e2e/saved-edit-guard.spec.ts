import { randomUUID } from 'node:crypto'
import { test, expect } from '@playwright/test'

test('saved VLAN routing-device edits close cleanly; later unsaved edits still prompt (#299)', async ({ page, request }) => {
  test.setTimeout(60000)
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()) })
  const siteResponse = await request.post('/api/sites', { data: { name: `Guard-${randomUUID()}` } })
  expect(siteResponse.status()).toBe(201)
  const site = await siteResponse.json() as { id: string; slug: string }
  try {
    const response = await request.post('/api/vlans', {
      data: { site_id: site.id, vlan_id: 299, name: 'Guard VLAN', color: '#3498DB' }
    })
    expect(response.status()).toBe(201)
    const vlan = await response.json() as { id: string }
    await page.goto(`/sites/${site.slug}/vlans`)
    await page.locator('main').getByText('Guard VLAN', { exact: true }).click()
    const panel = page.getByRole('dialog')
    await panel.getByRole('button', { name: /^(Edit|Bearbeiten)$/ }).click()
    await panel.locator('input[name="routing_device"]').fill('Saved router')
    const saved = page.waitForResponse(res => res.url().endsWith(`/api/vlans/${vlan.id}`) && res.request().method() === 'PUT')
    await panel.getByRole('button', { name: /^(Save|Speichern)$/ }).click()
    expect((await saved).ok()).toBe(true)
    await expect(panel.locator('form')).not.toBeVisible()
    await expect(panel.getByText('Saved router', { exact: true })).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(page.getByRole('dialog')).toHaveCount(0)
    expect((await (await request.get(`/api/vlans/${vlan.id}`)).json()).routing_device).toBe('Saved router')

    await page.locator('main').getByText('Guard VLAN', { exact: true }).click()
    await panel.getByRole('button', { name: /^(Edit|Bearbeiten)$/ }).click()
    await panel.locator('input[name="routing_device"]').fill('Unsaved router')
    await page.keyboard.press('Escape')
    const warning = page.getByRole('dialog').filter({ hasText: /unsaved changes|nicht gespeicherte Änderungen/i })
    await expect(warning).toBeVisible()
    await warning.getByRole('button', { name: /^(Cancel|Abbrechen)$/ }).click()
    await expect(panel.locator('input[name="routing_device"]')).toHaveValue('Unsaved router')
    expect(errors).toEqual([])
  } finally {
    expect((await request.delete(`/api/sites/${site.id}`)).ok()).toBe(true)
  }
})

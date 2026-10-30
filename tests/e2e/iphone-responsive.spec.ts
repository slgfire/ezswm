import { test, expect, type APIRequestContext, type BrowserContext } from '@playwright/test'
import { randomUUID } from 'node:crypto'

interface CreatedSite { id: string }
interface CreatedEntity { id: string }

async function removeOwned(request: APIRequestContext, path: string) {
  const response = await request.delete(path)
  expect([200, 204, 404], `cleanup ${path}`).toContain(response.status())
}

test('phone overviews and shared port grids remain readable and scrollable', async ({ browser, page, request }) => {
  const suffix = randomUUID()
  let siteId = ''
  let templateId = ''
  let switchId = ''
  let networkId = ''
  let publicTokenCreated = false
  const allocationIds: string[] = []
  let touchContext: BrowserContext | undefined
  const browserErrors: string[] = []

  try {
    const siteResponse = await request.post('/api/sites', { data: { name: `iPhone UI ${suffix}` } })
    expect(siteResponse.status()).toBe(201)
    const site = await siteResponse.json() as CreatedSite
    siteId = site.id
    const siteRoute = site.id

    const templateResponse = await request.post('/api/layout-templates', {
      data: {
        name: `iPhone UI ${suffix}`,
        units: [{ unit_number: 1, label: 'Unit 1', blocks: [{ type: 'rj45', count: 48, start_index: 1, rows: 2, label: 'RJ45' }] }]
      }
    })
    expect(templateResponse.status()).toBe(201)
    templateId = (await templateResponse.json() as CreatedEntity).id

    const switchName = `iPhone UI ${suffix}`
    const switchResponse = await request.post('/api/switches', {
      data: {
        site_id: siteId,
        name: switchName,
        role: 'core',
        management_ip: '192.0.2.1',
        management_url: 'https://switch.example.test/',
        layout_template_id: templateId
      }
    })
    expect(switchResponse.status()).toBe(201)
    const createdSwitch = await switchResponse.json() as { id: string, slug: string }
    switchId = createdSwitch.id
    const switchSlug = createdSwitch.slug
    const listedSwitches = await request.get(`/api/switches?site_id=${siteId}`)
    expect(listedSwitches.ok()).toBe(true)
    expect((await listedSwitches.json() as { data: Array<{ id: string }> }).data.some(item => item.id === switchId)).toBe(true)

    const networkResponse = await request.post('/api/networks', {
      data: { site_id: siteId, name: `iPhone UI ${suffix}`, subnet: '198.51.100.0/24' }
    })
    expect(networkResponse.status()).toBe(201)
    networkId = (await networkResponse.json() as CreatedEntity).id

    for (let index = 10; index < 34; index++) {
      const allocationResponse = await request.post(`/api/networks/${networkId}/allocations`, {
        data: { ip_address: `198.51.100.${index}`, hostname: `phone-host-${index}`, device_type: 'server' }
      })
      expect(allocationResponse.status()).toBe(201)
      allocationIds.push((await allocationResponse.json() as CreatedEntity).id)
    }

    const publicTokenResponse = await request.post(`/api/switches/${switchId}/public-token`)
    expect(publicTokenResponse.status()).toBe(201)
    publicTokenCreated = true
    const publicToken = (await publicTokenResponse.json() as { token: string }).token
    expect(publicToken).toBeTruthy()

    const profileResponse = await request.get('/api/auth/me')
    expect(profileResponse.ok()).toBe(true)
    const language = (await profileResponse.json() as { language?: string }).language
    const viewListLabel = language === 'de' ? 'Listenansicht' : 'List View'
    const viewGridLabel = language === 'de' ? 'Kartenansicht' : 'Card View'

    const touchState = await page.context().storageState()
    touchContext = await browser.newContext({
      hasTouch: true,
      viewport: { width: 390, height: 844 },
      storageState: touchState
    })
    const touchPage = await touchContext.newPage()
    for (const targetPage of [page, touchPage]) {
      targetPage.on('pageerror', error => browserErrors.push(error.message))
      targetPage.on('console', message => {
        if (message.type() === 'error') browserErrors.push(message.text())
      })
    }

    // Desktop keyboard focus must still reveal the complete action set.
    await page.setViewportSize({ width: 1280, height: 900 })
    await page.goto(`/sites/${siteRoute}/switches`)
    const desktopCard = page.locator('.card-glow').filter({ hasText: switchName }).first()
    await expect(desktopCard).toBeVisible({ timeout: 20000 })
    const desktopActions = desktopCard.locator('.switch-card-actions')
    await desktopCard.locator('a').first().focus()
    await expect(desktopActions).toHaveCSS('opacity', '1')
    await expect(desktopActions.locator('button, a')).toHaveCount(6)

    // Touch view: filter and action zones wrap rather than overlap at 390px and 320px.
    for (const width of [390, 320]) {
      await touchPage.setViewportSize({ width, height: 844 })
      await touchPage.goto(`/sites/${siteRoute}/switches`)
      const toolbar = touchPage.getByTestId('switch-list-toolbar')
      const controls = touchPage.getByTestId('switch-list-controls')
      await expect(toolbar).toBeVisible()
      const toolbarGeometry = await touchPage.evaluate(() => {
        const bounds = (element: Element) => {
          const rect = element.getBoundingClientRect()
          return { left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom, width: rect.width }
        }
        const filters = document.querySelector('[data-testid="switch-list-filters"]')!
        const controls = document.querySelector('[data-testid="switch-list-controls"]')!
        const fields = [...filters.querySelectorAll('.switch-filter-control')]
        return {
          viewport: window.innerWidth,
          documentWidth: document.documentElement.scrollWidth,
          filters: bounds(filters),
          controls: bounds(controls),
          fields: fields.map(bounds)
        }
      })
      console.log(`Switch overview ${width}px: ${JSON.stringify(toolbarGeometry)}`)
      expect(toolbarGeometry.documentWidth).toBeLessThanOrEqual(width)
      expect(toolbarGeometry.controls.top).toBeGreaterThanOrEqual(toolbarGeometry.filters.bottom - 1)
      expect(toolbarGeometry.fields.length).toBeGreaterThanOrEqual(2)
      expect(toolbarGeometry.fields.every(field => Math.abs(field.width - toolbarGeometry.fields[0]!.width) < 1)).toBe(true)
      await expect(controls).toBeVisible()

      const card = touchPage.locator('.card-glow').filter({ hasText: switchName }).first()
      const actions = card.locator('.switch-card-actions')
      await expect(actions).toHaveCSS('opacity', '1')
      await expect(actions.locator('button, a')).toHaveCount(6)
      const cardGeometry = await card.evaluate(element => {
        const rect = (node: Element) => {
          const box = node.getBoundingClientRect()
          return { left: box.left, top: box.top, right: box.right, bottom: box.bottom }
        }
        return {
          title: rect(element.querySelector('h3')!),
          actions: rect(element.querySelector('.switch-card-actions')!)
        }
      })
      expect(cardGeometry.actions.bottom).toBeLessThanOrEqual(cardGeometry.title.top + 1)

      await touchPage.getByRole('button', { name: viewListLabel, exact: true }).click()
      const listCard = touchPage.locator('.card-glow').filter({ hasText: switchName }).first()
      await expect(listCard).toBeVisible()
      const listActions = listCard.locator('.switch-card-actions')
      await expect(listActions).toHaveCSS('opacity', '1')
      await expect(listActions.locator('button, a')).toHaveCount(5)
      const listGeometry = await listCard.evaluate(element => {
        const bounds = (node: Element) => {
          const box = node.getBoundingClientRect()
          return { top: box.top, bottom: box.bottom }
        }
        return { title: bounds(element.querySelector('h3')!), actions: bounds(element.querySelector('.switch-card-actions')!) }
      })
      expect(listGeometry.actions.bottom).toBeLessThanOrEqual(listGeometry.title.top + 1)
      await touchPage.getByRole('button', { name: viewGridLabel, exact: true }).click()
    }

    // IP filters use one full-width column on phone; the first row starts below its header.
    await touchPage.goto(`/sites/${siteRoute}/ip-addresses`)
    const ipFilters = touchPage.getByTestId('ip-address-filters')
    await expect(ipFilters).toBeVisible()
    for (const width of [390, 320]) {
      await touchPage.setViewportSize({ width, height: 844 })
      const ipFilterWidths = await ipFilters.locator('.ip-address-filter').evaluateAll(elements =>
        elements.map(element => element.getBoundingClientRect().width)
      )
      expect(ipFilterWidths).toHaveLength(4)
      expect(ipFilterWidths.every(value => Math.abs(value - ipFilterWidths[0]!) < 1)).toBe(true)
    }
    await touchPage.setViewportSize({ width: 390, height: 844 })

    const table = touchPage.getByTestId('ip-address-table')
    await expect(table.locator('tbody tr')).toHaveCount(24)
    const initialTableGeometry = await table.evaluate(root => {
      const header = root.querySelector('thead')!.getBoundingClientRect()
      const firstRow = root.querySelector('tbody tr')!.getBoundingClientRect()
      let owner: HTMLElement | null = root as HTMLElement
      while (owner && owner !== document.body) {
        const style = getComputedStyle(owner)
        if (/(auto|scroll|overlay)/.test(style.overflowY) && owner.scrollHeight > owner.clientHeight + 1) break
        owner = owner.parentElement
      }
      if (owner === document.body) owner = null
      return {
        headerTop: header.top,
        headerBottom: header.bottom,
        rowTop: firstRow.top,
        rootTop: root.getBoundingClientRect().top,
        rootBottom: root.getBoundingClientRect().bottom,
        ownerIsTable: owner === root,
        ownerTag: owner?.tagName,
        ownerClass: owner?.className,
        ownerClientHeight: owner?.clientHeight,
        ownerScrollHeight: owner?.scrollHeight
      }
    })
    console.log(`IP table at rest: ${JSON.stringify(initialTableGeometry)}`)
    expect(initialTableGeometry.rowTop).toBeGreaterThanOrEqual(initialTableGeometry.headerBottom - 1)
    expect(initialTableGeometry.ownerIsTable).toBe(true)

    await table.evaluate(root => { (root as HTMLElement).scrollTop = 100 })
    const scrolledTableGeometry = await table.evaluate(root => {
      const header = root.querySelector('thead')!.getBoundingClientRect()
      const rootRect = root.getBoundingClientRect()
      return { headerTop: header.top, rootTop: rootRect.top, headerBottom: header.bottom, rootBottom: rootRect.bottom }
    })
    console.log(`IP table after scroll: ${JSON.stringify(scrolledTableGeometry)}`)
    expect(scrolledTableGeometry.headerTop).toBeGreaterThanOrEqual(scrolledTableGeometry.rootTop - 1)
    expect(scrolledTableGeometry.headerBottom).toBeLessThanOrEqual(scrolledTableGeometry.rootBottom + 1)

    // The shared renderer is also used by switch detail, template preview and public view.
    const rendererPages = [
      `/sites/${siteRoute}/switches/${switchSlug || switchId}`,
      `/layout-templates/${templateId}`,
      `/p/${publicToken}`
    ]
    for (const path of rendererPages) {
      await touchPage.goto(path)
      const portGrid = touchPage.locator('.port-grid-unit').first()
      await expect(portGrid).toBeVisible()
      const scrollGeometry = await portGrid.evaluate(element => {
        const grid = element as HTMLElement
        const fade = getComputedStyle(grid, '::after')
        grid.scrollLeft = grid.scrollWidth
        return {
          viewportWidth: grid.clientWidth,
          contentWidth: grid.scrollWidth,
          finalScrollLeft: grid.scrollLeft,
          fadeContent: fade.content,
          fadeBackground: fade.backgroundImage
        }
      })
      console.log(`Port renderer ${path.split('/')[1]}: ${JSON.stringify(scrollGeometry)}`)
      expect(scrollGeometry.contentWidth).toBeGreaterThan(scrollGeometry.viewportWidth)
      expect(scrollGeometry.finalScrollLeft).toBeGreaterThan(0)
      expect(scrollGeometry.fadeContent).toBe('none')
    }

    expect(browserErrors).toEqual([])
  } finally {
    await touchContext?.close()
    if (publicTokenCreated && switchId) await removeOwned(request, `/api/switches/${switchId}/public-token`)
    if (networkId) {
      for (const id of allocationIds) await removeOwned(request, `/api/networks/${networkId}/allocations/${id}`)
      await removeOwned(request, `/api/networks/${networkId}`)
    }
    if (switchId) await removeOwned(request, `/api/switches/${switchId}?siteId=${encodeURIComponent(siteId)}`)
    if (templateId) await removeOwned(request, `/api/layout-templates/${templateId}`)
    if (siteId) await removeOwned(request, `/api/sites/${siteId}`)
  }
})

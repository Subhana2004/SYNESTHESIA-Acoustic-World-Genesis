const { test, expect } = require('@playwright/test')

test('renders the 3D world and the core instrument interface', async ({ page }, testInfo) => {
  const pageErrors = []
  page.on('pageerror', error => pageErrors.push(error.message))
  await page.goto('/')
  await expect(page).toHaveTitle(/SYNESTHESIA/)
  await expect(page.getByRole('heading', { name: /Worlds born/i })).toBeVisible()
  await expect(page.getByRole('button', { name: /Begin listening/i })).toBeVisible()
  const canvas = page.locator('.viewport canvas')
  await expect(canvas).toHaveCount(1)
  await expect.poll(() => canvas.evaluate(node => ({ width: node.width, height: node.height }))).toMatchObject({
    width: expect.any(Number),
    height: expect.any(Number),
  })
  const dimensions = await canvas.evaluate(node => ({ width: node.width, height: node.height }))
  expect(dimensions.width).toBeGreaterThan(0)
  expect(dimensions.height).toBeGreaterThan(0)
  await page.screenshot({ path: testInfo.outputPath('synesthesia-home.png'), fullPage: true })
  expect(pageErrors).toEqual([])
})

test('supports keyboard exploration through the biome minimap', async ({ page }) => {
  await page.goto('/')
  const map = page.locator('.world-map')
  await map.focus()
  await page.keyboard.press('ArrowRight')
  await expect(page.locator('.inspection-panel')).toContainText('World position')
  await page.keyboard.press('ArrowDown')
  await expect(page.locator('.inspection-panel')).toContainText('Elevation')
})

test('camera controls are operable without breaking the scene', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Zoom in' }).click()
  await page.getByRole('button', { name: 'Zoom out' }).click()
  await page.getByRole('button', { name: 'Reset camera view' }).click()
  await expect(page.locator('.viewport canvas')).toBeVisible()
})

test('saves, exports, imports, restores, renames and deletes a world', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'SAVE CURRENT WORLD' }).click()
  await expect(page.locator('.memory-message')).toContainText('World saved')
  await expect(page.locator('.world-card')).toHaveCount(1)

  await page.locator('.world-card').first().click()
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'EXPORT FILE' }).click(),
  ])
  const filePath = await download.path()
  expect(filePath).toBeTruthy()
  await page.locator('input[type="file"]').setInputFiles(filePath)
  await expect(page.locator('.memory-message')).toContainText('imported into this browser')
  await expect(page.locator('.world-card')).toHaveCount(2)

  await page.getByRole('button', { name: 'LOAD WORLD' }).click()
  await expect(page.locator('.memory-message')).toContainText('restored with')
  const name = page.getByRole('textbox', { name: 'World name' })
  await name.fill('Browser verified world')
  await page.getByRole('button', { name: 'RENAME' }).click()
  await expect(page.locator('.memory-message')).toContainText('World renamed')
  await page.getByRole('button', { name: 'DELETE' }).click()
  await page.getByRole('button', { name: 'YES, DELETE' }).click()
  await expect(page.locator('.memory-message')).toContainText('deleted from this browser')
  await expect(page.locator('.world-card')).toHaveCount(1)
})

test('shows a helpful message when microphone permission is denied', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: { getUserMedia: () => Promise.reject(new DOMException('Permission denied', 'NotAllowedError')) },
    })
  })
  await page.goto('/')
  await page.getByRole('button', { name: /Begin listening/i }).click()
  await expect(page.getByRole('alert')).toContainText(/Permission denied/i)
  await expect(page.getByRole('button', { name: /Begin listening/i })).toBeEnabled()
})

test('starts and pauses a fake microphone stream', async ({ page, context }) => {
  await context.grantPermissions(['microphone'])
  await page.goto('/')
  await page.getByRole('button', { name: /Begin listening/i }).click()
  await expect(page.locator('.world-head')).toContainText('LISTENING')
  await page.getByRole('button', { name: /Pause input/i }).click()
  await expect(page.locator('.world-head')).toContainText('WORLD AT REST')
})

test('keeps the mobile layout within the screen width', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('.viewport canvas')).toBeVisible()
  const sizes = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    content: document.documentElement.scrollWidth,
  }))
  expect(sizes.content).toBeLessThanOrEqual(sizes.viewport + 1)
})

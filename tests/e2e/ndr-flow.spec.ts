import { test, expect } from '@playwright/test'

const BASE = process.env.BASE_URL || 'http://localhost:3000'

test.describe('NDR Rescue E2E Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE}/login`)
    await page.fill('#email', 'demo@logistics.com')
    await page.fill('#password', 'demo1234')
    await page.click('#login-submit')
    await page.waitForURL(`${BASE}/dashboard`)
  })

  test('login redirects to dashboard', async ({ page }) => {
    await expect(page).toHaveURL(`${BASE}/dashboard`)
    await expect(page.locator('h1')).toContainText('Overview')
  })

  test('dashboard shows KPI cards', async ({ page }) => {
    await expect(page.getByText('Total NDRs', { exact: true })).toBeVisible()
    await expect(page.getByText('Recovered', { exact: true })).toBeVisible()
    await expect(page.getByText('Recovery Rate', { exact: true })).toBeVisible()
  })

  test('shipment queue loads and shows data', async ({ page }) => {
    await page.goto(`${BASE}/shipments`)
    await expect(page.locator('table tbody tr').first()).toBeVisible({ timeout: 10_000 })

    // At least one row exists (seed data)
    const rowCount = await page.locator('table tbody tr').count()
    expect(rowCount).toBeGreaterThan(0)

    // At least one tracking number is visible
    await expect(page.locator('text=TRK1000').first()).toBeVisible()
  })

  test('search filters shipments', async ({ page }) => {
    await page.goto(`${BASE}/shipments`)
    await expect(page.locator('table tbody tr').first()).toBeVisible({ timeout: 10_000 })

    await page.fill('#shipment-search', 'TRK10001')
    await expect(page.locator('text=TRK10001')).toBeVisible()
    await expect(page.locator('text=TRK10002')).not.toBeVisible()
  })

  test('trigger call → simulate webhook → see transcript on detail page', async ({ page }) => {
    await page.goto(`${BASE}/shipments`)
    await expect(page.locator('table tbody tr').first()).toBeVisible({ timeout: 10_000 })

    // Prefer an exact count over `.first().count()`, which can race before rows hydrate
    const triggerButtons = page.locator('[id^="trigger-call-"]')
    await expect(triggerButtons.first()).toBeVisible({ timeout: 10_000 })

    const btnId = await triggerButtons.first().getAttribute('id') ?? ''
    const shipmentId = btnId.replace('trigger-call-', '')

    await triggerButtons.first().click()
    await expect(page.locator('text=Call queued').first()).toBeVisible({ timeout: 10_000 })

    // Avoid networkidle — SSE keeps the connection open
    await page.goto(`${BASE}/shipments/${shipmentId}`)

    await expect(page.locator('span').filter({ hasText: 'CALL SCHEDULED' }).first()).toBeVisible({ timeout: 10_000 })

    await expect(page.locator('#simulate-webhook-btn')).toBeVisible({ timeout: 5_000 })
    await page.click('#simulate-webhook-btn')
    await expect(page.locator('text=Webhook simulated').first()).toBeVisible({ timeout: 10_000 })

    await expect(page.locator('text=Transcript').first()).toBeVisible({ timeout: 15_000 })
  })

  test('missed call creates fallback ladder with recovery link', async ({ page }) => {
    await page.goto(`${BASE}/shipments`)
    await expect(page.locator('table tbody tr').first()).toBeVisible({ timeout: 10_000 })

    const triggerButtons = page.locator('[id^="trigger-call-"]')
    await expect(triggerButtons.first()).toBeVisible({ timeout: 10_000 })

    const btnId = await triggerButtons.first().getAttribute('id') ?? ''
    const shipmentId = btnId.replace('trigger-call-', '')

    await triggerButtons.first().click()
    await expect(page.locator('text=Call queued').first()).toBeVisible({ timeout: 10_000 })

    await page.goto(`${BASE}/shipments/${shipmentId}`)
    await expect(page.locator('#simulate-no-answer-btn')).toBeVisible({ timeout: 5_000 })
    await page.click('#simulate-no-answer-btn')

    await expect(page.locator('text=Missed-call webhook simulated').first()).toBeVisible({ timeout: 10_000 })
    await expect(page.locator('text=No-Answer Fallback Ladder')).toBeVisible({ timeout: 15_000 })
    await expect(page.locator('text=RETRY SCHEDULED').first()).toBeVisible({ timeout: 15_000 })
  })

  test('logout clears session', async ({ page }) => {
    await page.click('#logout-btn')
    await page.goto(`${BASE}/login`)
    await expect(page.locator('h2')).toContainText('Log in to your account')
  })
})

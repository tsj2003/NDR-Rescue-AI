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
    await expect(page.locator('h1')).toContainText('Dashboard')
  })

  test('dashboard shows KPI cards', async ({ page }) => {
    await expect(page.locator('text=Total NDRs')).toBeVisible()
    await expect(page.locator('text=Recovered')).toBeVisible()
    await expect(page.locator('text=Recovery Rate')).toBeVisible()
  })

  test('shipment queue loads and shows data', async ({ page }) => {
    await page.goto(`${BASE}/shipments`)
    await page.waitForLoadState('networkidle')

    // At least one row exists (seed data)
    const rowCount = await page.locator('table tbody tr').count()
    expect(rowCount).toBeGreaterThan(0)

    // At least one tracking number is visible
    await expect(page.locator('text=TRK1000').first()).toBeVisible()
  })

  test('search filters shipments', async ({ page }) => {
    await page.goto(`${BASE}/shipments`)
    await page.waitForLoadState('networkidle')

    // Wait for table to load
    await expect(page.locator('table tbody tr').first()).toBeVisible()

    await page.fill('#shipment-search', 'TRK10001')
    await expect(page.locator('text=TRK10001')).toBeVisible()
    await expect(page.locator('text=TRK10002')).not.toBeVisible()
  })

  test('trigger call → simulate webhook → see transcript on detail page', async ({ page }) => {
    await page.goto(`${BASE}/shipments`)
    await page.waitForLoadState('networkidle')

    // Find a FAILED_ATTEMPT row via its trigger button
    const triggerBtn = page.locator('[id^="trigger-call-"]').first()
    
    // If no trigger buttons exist (all already triggered), skip gracefully
    const triggerCount = await triggerBtn.count()
    if (triggerCount === 0) {
      test.skip(true, 'No FAILED_ATTEMPT shipments available — seed the DB')
      return
    }

    // Get shipment ID from the button id attribute
    const btnId = await triggerBtn.getAttribute('id') ?? ''
    const shipmentId = btnId.replace('trigger-call-', '')

    // Click trigger
    await triggerBtn.click()
    await expect(page.locator('text=Call queued').first()).toBeVisible({ timeout: 10_000 })

    // Navigate directly to the detail page for this shipment
    await page.goto(`${BASE}/shipments/${shipmentId}`)
    await page.waitForLoadState('networkidle')

    // Wait for CALL_SCHEDULED badge to appear on detail page
    await expect(page.locator('span').filter({ hasText: 'CALL SCHEDULED' }).first()).toBeVisible({ timeout: 10_000 })

    // Click simulate webhook
    await expect(page.locator('#simulate-webhook-btn')).toBeVisible({ timeout: 5_000 })
    await page.click('#simulate-webhook-btn')
    await expect(page.locator('text=Webhook simulated').first()).toBeVisible({ timeout: 10_000 })

    // Wait for transcript to appear (page refreshes after 500ms)
    await expect(page.locator('text=Transcript').first()).toBeVisible({ timeout: 15_000 })
  })

  test('logout clears session', async ({ page }) => {
    await page.click('#logout-btn')
    await page.goto(`${BASE}/login`)
    await expect(page.locator('h2')).toContainText('Sign in')
  })
})

import { expect, test } from '@playwright/test'

test('admin login and visual editor controls are available in live preview', async ({ page }) => {
  test.setTimeout(120_000)

  await page.goto('/admin/login', { waitUntil: 'domcontentloaded' })
  await page.getByRole('textbox', { name: /E-Mail|Email/i }).waitFor({ timeout: 90_000 })
  await page.getByRole('textbox', { name: /E-Mail|Email/i }).fill('demo@artus-engineering.de')
  await page.getByRole('textbox', { name: /Passwort|Password/i }).fill('demo1234')
  await page.getByRole('button', { name: /Anmelden|Login/i }).click()
  await page.waitForURL((url) => !url.pathname.endsWith('/login'), { timeout: 60_000 })

  await page.goto('/admin/collections/pages')
  const homepageLink = page.getByRole('link', { name: 'Homepage' })

  if ((await homepageLink.count()) === 0) {
    await page.getByRole('link', { name: /Create new Page/i }).click()
    await page.getByLabel(/^Title/i).fill('Homepage')
    await page.getByLabel(/^Slug/i).fill('home')
    await page.getByRole('button', { name: /Save Draft|Save draft/i }).click()
    await page.waitForURL(/\/admin\/collections\/pages\//, { timeout: 30_000 })
  } else {
    await homepageLink.click()
    await page.waitForURL(/\/admin\/collections\/pages\//, { timeout: 30_000 })
  }

  await page.getByRole('button', { name: 'Live Preview' }).click()
  await expect(page.getByRole('button', { name: 'Edit' })).toBeVisible({ timeout: 30_000 })
})

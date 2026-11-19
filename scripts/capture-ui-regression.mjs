/**
 * UI screenshots + layout checks for portico-admin (candidate portico-ui in node_modules).
 * Does NOT imply final visual sign-off.
 *
 * Usage:
 *   npm run dev -- --host 127.0.0.1 --port 5173
 *   npm install --no-save playwright@1.49.0
 *   SCREENSHOT_DIR=/opt/cursor/artifacts node scripts/capture-ui-regression.mjs
 */
import { chromium } from 'playwright'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'

const baseUrl = process.env.SCREENSHOT_BASE_URL ?? 'http://127.0.0.1:5173'
const outDir = process.env.SCREENSHOT_DIR ?? '/opt/cursor/artifacts'
const COMMIT = 'ccd5058cf8277579dd38bc17bdb0915e6b6481fd'

const DESKTOP = { width: 1440, height: 1000 }
const NARROW = { width: 390, height: 844 }

const issues = []

function issue(severity, area, detail) {
  issues.push({ severity, area, detail })
}

async function setTheme(page, mode) {
  await page.evaluate((m) => {
    localStorage.setItem('portico-admin-theme', m)
    if (m === 'dark') {
      document.documentElement.classList.add('pt-dark')
      document.documentElement.setAttribute('data-pt-theme', 'dark')
    } else {
      document.documentElement.classList.remove('pt-dark')
      document.documentElement.removeAttribute('data-pt-theme')
    }
  }, mode)
}

async function closeMobileNav(page) {
  const open = await page.locator('.admin-sidebar.is-open').count()
  if (open > 0) {
    await page.keyboard.press('Escape').catch(() => {})
    await page.locator('.admin-sidebar-backdrop').click({ timeout: 2000 }).catch(() => {})
  }
}

async function assertNoEmailOverlap(page) {
  return page.evaluate(() => {
    const rows = [...document.querySelectorAll('.pt-table tbody tr')].slice(0, 5)
    for (const row of rows) {
      const cells = row.querySelectorAll('td')
      if (cells.length < 3) continue
      const email = cells[1].querySelector('.table-ellipsis-cell') ?? cells[1]
      const dept = cells[2]
      const er = email.getBoundingClientRect()
      const dr = dept.getBoundingClientRect()
      const overlap = er.right > dr.left + 2
      const emailScroll = email.scrollWidth > email.clientWidth + 1
      if (overlap) {
        return { ok: false, reason: 'email-right overlaps department-left', er: er.right, dr: dr.left }
      }
      if (email.scrollWidth > email.clientWidth + 48 && emailScroll === false) {
        return { ok: false, reason: 'email overflows without ellipsis clip' }
      }
    }
    return { ok: true }
  })
}

async function shot(page, name) {
  await page.waitForTimeout(300)
  await page.screenshot({ path: path.join(outDir, name), fullPage: false })
}

const browser = await chromium.launch()
const context = await browser.newContext({ locale: 'zh-CN' })
const page = await context.newPage()
await mkdir(outDir, { recursive: true })

try {
  await page.setViewportSize(DESKTOP)
  await page.goto(`${baseUrl}/`, { waitUntil: 'networkidle' })
  await setTheme(page, 'light')
  await page.goto(`${baseUrl}/users`, { waitUntil: 'networkidle' })
  await closeMobileNav(page)
  const lightOverlap = await assertNoEmailOverlap(page)
  if (!lightOverlap.ok) issue('error', 'table-layout', `desktop light: ${lightOverlap.reason}`)
  await shot(page, 'candidate-users-light-ccd5058.png')

  await setTheme(page, 'dark')
  await page.reload({ waitUntil: 'networkidle' })
  await closeMobileNav(page)
  const darkOverlap = await assertNoEmailOverlap(page)
  if (!darkOverlap.ok) issue('error', 'table-layout', `desktop dark: ${darkOverlap.reason}`)
  await shot(page, 'candidate-users-dark-ccd5058.png')

  await setTheme(page, 'light')
  await page.goto(`${baseUrl}/form-demo`, { waitUntil: 'networkidle' })
  await closeMobileNav(page)
  await shot(page, 'candidate-form-light-ccd5058.png')

  await setTheme(page, 'dark')
  await page.reload({ waitUntil: 'networkidle' })
  await closeMobileNav(page)
  await shot(page, 'candidate-form-dark-ccd5058.png')

  await page.setViewportSize(NARROW)
  await setTheme(page, 'dark')
  await page.goto(`${baseUrl}/users`, { waitUntil: 'networkidle' })
  await page.locator('button:has-text("菜单")').first().click()
  await page.waitForSelector('.admin-sidebar.is-open', { timeout: 3000 })
  await shot(page, 'candidate-narrow-dark-nav-ccd5058.png')

  await closeMobileNav(page)
  await page.waitForSelector('.admin-sidebar:not(.is-open)', { timeout: 3000 }).catch(() => {})
  const scrollMetrics = await page.evaluate(() => {
    const wrap = document.querySelector('.pt-table__wrap')
    if (!wrap) return null
    return { scrollW: wrap.scrollWidth, clientW: wrap.clientWidth, canScroll: wrap.scrollWidth > wrap.clientWidth }
  })
  if (!scrollMetrics?.canScroll) {
    issue('warn', 'table-scroll', 'narrow users: table wrap does not scroll horizontally (may be ok if columns fit)')
  }
  const narrowOverlap = await assertNoEmailOverlap(page)
  if (!narrowOverlap.ok) issue('error', 'table-layout', `narrow closed nav: ${narrowOverlap.reason}`)
  await shot(page, 'candidate-users-narrow-closed-ccd5058.png')

  const evidence = {
    candidateCommit: COMMIT,
    finalVerificationComplete: false,
    designerVisualAudit: 'pending',
    visualSignOff: false,
    note: 'ccd5058 not visually accepted; expect refreshed portico-ui tarball before final rerun.',
    viewports: { desktop: DESKTOP, narrow: NARROW },
    checks: { lightOverlap, darkOverlap, narrowOverlap, scrollMetrics },
    issues,
    libraryNote:
      'Designer confirmed overflow in standalone portico-ui demo; component team investigating. Admin uses column width + TableEllipsisCell slots + pt-table__wrap scroll only.',
  }

  await writeFile(path.join(outDir, 'candidate-ui-regression-ccd5058.json'), JSON.stringify(evidence, null, 2))
  console.log(JSON.stringify(evidence, null, 2))
  if (issues.some((i) => i.severity === 'error')) process.exitCode = 1
} finally {
  await browser.close()
}
/**
 * UI screenshots + layout checks (candidate portico-ui in node_modules).
 * Does NOT imply final visual sign-off.
 */
import { chromium } from 'playwright'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'

const baseUrl = process.env.SCREENSHOT_BASE_URL ?? 'http://127.0.0.1:5173'
const outDir = process.env.SCREENSHOT_DIR ?? '/opt/cursor/artifacts'
const COMMIT = '4bcf938b0bca4d37ece836eaff1a714002db880f'
const TAG = '4bcf938'

const DESKTOP = { width: 1440, height: 1000 }
const NARROW = { width: 390, height: 844 }
const DEVICE_SCALE_FACTOR = 1

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

/** Narrow layout: close drawer via backdrop (menu button is covered while open). */
async function ensureMobileNavClosed(page) {
  for (let attempt = 0; attempt < 4; attempt++) {
    const state = await getMobileNavState(page)
    if (state.closed) return state
    if ((await page.locator('.admin-sidebar-backdrop').count()) > 0) {
      const vp = page.viewportSize() ?? NARROW
      await page.mouse.click(vp.width - 32, Math.floor(vp.height / 2))
    } else {
      await page.locator('button:has-text("菜单")').first().click({ force: true })
    }
    await page.waitForTimeout(400)
  }
  const state = await getMobileNavState(page)
  if (!state.closed) {
    throw new Error(`mobile nav failed to close: ${JSON.stringify(state)}`)
  }
  return state
}

async function ensureMobileNavOpen(page) {
  const state = await getMobileNavState(page)
  if (state.open) return state
  await page.locator('button:has-text("菜单")').first().click()
  await page.waitForSelector('.admin-sidebar.is-open', { timeout: 5000 })
  await page.waitForSelector('.admin-sidebar-backdrop', { timeout: 5000 })
  return getMobileNavState(page)
}

async function getMobileNavState(page) {
  return page.evaluate(() => {
    const sidebar = document.querySelector('.admin-sidebar')
    const backdrop = document.querySelector('.admin-sidebar-backdrop')
    const main = document.querySelector('.admin-main')
    const sb = sidebar?.getBoundingClientRect()
    const mainRect = main?.getBoundingClientRect()
    const backdropVisible = !!backdrop && backdrop.getBoundingClientRect().width > 0
    const openClass = sidebar?.classList.contains('is-open') ?? false
    const sidebarCoversMain =
      !!sb && !!mainRect && sb.right > mainRect.left + 8 && sb.width > 48
    const closed = !backdropVisible && !openClass && !sidebarCoversMain
    return {
      closed,
      open: openClass && backdropVisible,
      openClass,
      backdropVisible,
      sidebarCoversMain,
      sidebarRight: sb?.right ?? null,
      mainLeft: mainRect?.left ?? null,
    }
  })
}

async function assertNoEmailOverlap(page) {
  return page.evaluate(() => {
    const rows = [...document.querySelectorAll('.pt-table tbody tr')].slice(0, 5)
    for (const row of rows) {
      const cells = row.querySelectorAll('td')
      if (cells.length < 3) continue
      const email = cells[1].querySelector('.table-ellipsis-cell, .pt-table__cell') ?? cells[1]
      const dept = cells[2]
      const er = email.getBoundingClientRect()
      const dr = dept.getBoundingClientRect()
      if (er.right > dr.left + 2) {
        return { ok: false, reason: 'email-right overlaps department-left', er: er.right, dr: dr.left }
      }
    }
    return { ok: true }
  })
}

async function shot(page, name) {
  await page.waitForTimeout(250)
  await page.screenshot({ path: path.join(outDir, name), fullPage: false })
}

const browser = await chromium.launch()
const context = await browser.newContext({
  locale: 'zh-CN',
  viewport: DESKTOP,
  deviceScaleFactor: DEVICE_SCALE_FACTOR,
})
const page = await context.newPage()
await mkdir(outDir, { recursive: true })

try {
  await page.goto(`${baseUrl}/`, { waitUntil: 'networkidle' })
  await setTheme(page, 'light')
  await page.goto(`${baseUrl}/users`, { waitUntil: 'networkidle' })

  const lightOverlap = await assertNoEmailOverlap(page)
  if (!lightOverlap.ok) issue('error', 'table-layout', `desktop light: ${lightOverlap.reason}`)
  await shot(page, `candidate-users-light-${TAG}.png`)

  await setTheme(page, 'dark')
  await page.reload({ waitUntil: 'networkidle' })
  const darkOverlap = await assertNoEmailOverlap(page)
  if (!darkOverlap.ok) issue('error', 'table-layout', `desktop dark: ${darkOverlap.reason}`)
  await shot(page, `candidate-users-dark-${TAG}.png`)

  await setTheme(page, 'light')
  await page.goto(`${baseUrl}/form-demo`, { waitUntil: 'networkidle' })
  await shot(page, `candidate-form-light-${TAG}.png`)

  await setTheme(page, 'dark')
  await page.reload({ waitUntil: 'networkidle' })
  await shot(page, `candidate-form-dark-${TAG}.png`)

  await page.setViewportSize(NARROW)
  await setTheme(page, 'dark')
  await page.goto(`${baseUrl}/users`, { waitUntil: 'networkidle' })

  const navOpenState = await ensureMobileNavOpen(page)
  await shot(page, `candidate-narrow-dark-nav-${TAG}.png`)

  const navClosedState = await ensureMobileNavClosed(page)

  const scrollMetrics = await page.evaluate(() => {
    const wrap = document.querySelector('.pt-table__wrap')
    if (!wrap) return null
    return {
      scrollW: wrap.scrollWidth,
      clientW: wrap.clientWidth,
      canScroll: wrap.scrollWidth > wrap.clientWidth,
    }
  })
  if (!scrollMetrics?.canScroll) {
    issue('warn', 'table-scroll', 'narrow closed nav: horizontal scroll not available on table wrap')
  }

  const narrowOverlap = await assertNoEmailOverlap(page)
  if (!narrowOverlap.ok) issue('error', 'table-layout', `narrow closed nav: ${narrowOverlap.reason}`)
  await shot(page, `candidate-users-narrow-closed-${TAG}.png`)

  const viewport = page.viewportSize()
  const evidence = {
    candidateCommit: COMMIT,
    supersedes: 'ccd5058cf8277579dd38bc17bdb0915e6b6481fd',
    finalVerificationComplete: false,
    visualSignOff: false,
    designerVisualAudit: 'pending re-audit',
    viewport: {
      css: viewport,
      deviceScaleFactor: DEVICE_SCALE_FACTOR,
      desktopCapture: DESKTOP,
      narrowCapture: NARROW,
    },
    mobileNav: {
      beforeOpenShot: navOpenState,
      afterCloseShot: navClosedState,
    },
    checks: { lightOverlap, darkOverlap, narrowOverlap, scrollMetrics },
    issues,
    adminIntegration:
      'Fixed column widths; slot-local TableEllipsisCell for text; no portico-ui CSS patches.',
    library4bcf938:
      'Default cells + colgroup + PtTableEllipsisCell export; disabled neutral + loading label fixes. Re-audit pending.',
  }

  const jsonPath = path.join(outDir, `candidate-ui-regression-${TAG}.json`)
  await writeFile(jsonPath, JSON.stringify(evidence, null, 2))
  console.log(JSON.stringify(evidence, null, 2))
  if (issues.some((i) => i.severity === 'error') || !navClosedState.closed) {
    process.exitCode = 1
  }
} finally {
  await browser.close()
}
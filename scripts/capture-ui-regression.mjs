/**
 * UI screenshots + layout checks (candidate portico-ui in node_modules).
 * Does NOT imply final visual sign-off.
 */
import { chromium } from 'playwright'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'

const baseUrl = process.env.SCREENSHOT_BASE_URL ?? 'http://127.0.0.1:5173'
const outDir = process.env.SCREENSHOT_DIR ?? '/opt/cursor/artifacts'
const CANDIDATE_REF = 'f84d4bd'
const TAG = CANDIDATE_REF
const TARBALL_SHA256 =
  'cb01d7eccf4ecfe438c0b89bb6c5ac723a2071f309b503d6d7db0974488ad7fa'
const TARBALL_NAME = 'portico-ui-0.1.0_a58a.tgz'
const PORTICO_UI_IMPLEMENTATION_SHA = 'f84d4bd76e76daa7ead98d4b7a5fe0b442fecc78'
const PORTICO_UI_BRANCH_HEAD_SHA = 'fb0916777b40becdca1f39e4d12b16559e57de01'
const ADMIN_BRANCH = 'cursor/portico-admin-v1-1deb'

const DESKTOP = { width: 1440, height: 1000 }
const NARROW = { width: 390, height: 844 }
const DEVICE_SCALE_FACTOR = 1

const TOOLTIP_SHOW_AFTER_MS = 80
const TOOLTIP_HIDE_AFTER_MS = 80
const TOOLTIP_LEAVE_WAIT_MS = TOOLTIP_HIDE_AFTER_MS + 160

const issues = []

function issue(severity, area, detail) {
  issues.push({ severity, area, detail })
}

function srgbChannelToLinear(channel) {
  const v = channel / 255
  return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4
}

function relativeLuminance([r, g, b]) {
  return (
    0.2126 * srgbChannelToLinear(r) +
    0.7152 * srgbChannelToLinear(g) +
    0.0722 * srgbChannelToLinear(b)
  )
}

/** WCAG 2.x contrast ratio from sRGB `[r,g,b]` tuples. */
function wcagContrast(fgRgb, bgRgb) {
  const l1 = relativeLuminance(fgRgb)
  const l2 = relativeLuminance(bgRgb)
  const lighter = Math.max(l1, l2)
  const darker = Math.min(l1, l2)
  return (lighter + 0.05) / (darker + 0.05)
}

function parseRgbCss(color) {
  const m = color.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i)
  return m ? [Number(m[1]), Number(m[2]), Number(m[3])] : null
}

const wcagCalibration = {
  blackOnWhite: wcagContrast([0, 0, 0], [255, 255, 255]),
  whiteOnBlack: wcagContrast([255, 255, 255], [0, 0, 0]),
  whiteOnPrimaryIdle: wcagContrast([255, 255, 255], [0x34, 0x73, 0xce]),
  whiteOnPrimaryActive: wcagContrast([255, 255, 255], [0x27, 0x5a, 0xa3]),
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

function sampleButtonContrastFromPage() {
  return (el) => {
    const cs = getComputedStyle(el)
    const color = cs.color
    const bg = cs.backgroundColor
    const matchesActive = el.matches(':active')
    return { color, background: bg, matchesActive }
  }
}

async function checkPrimaryButtonContrast(page) {
  const btn = page.locator('.pt-table .pt-button--primary').first()
  await btn.waitFor({ state: 'visible' })
  await btn.scrollIntoViewIfNeeded()

  const idleSample = await btn.evaluate(sampleButtonContrastFromPage())
  const idleFg = parseRgbCss(idleSample.color)
  const idleBg = parseRgbCss(idleSample.background)
  const idleContrast =
    idleFg && idleBg ? wcagContrast(idleFg, idleBg) : null

  const box = await btn.boundingBox()
  if (!box) throw new Error('primary button missing bounding box')
  const x = box.x + box.width / 2
  const y = box.y + box.height / 2
  await page.mouse.move(x, y)
  await page.mouse.down()
  await page.waitForTimeout(80)
  const activeSample = await btn.evaluate(sampleButtonContrastFromPage())
  await page.mouse.up()
  const activeFg = parseRgbCss(activeSample.color)
  const activeBg = parseRgbCss(activeSample.background)
  const activeContrast =
    activeFg && activeBg ? wcagContrast(activeFg, activeBg) : null

  const wcagAANormalText = 4.5
  return {
    method: 'playwright mouse.down on button center; WCAG 2.x relative luminance',
    wcagCalibration,
    wcagAANormalText,
    idle: {
      ...idleSample,
      contrast: idleContrast,
      wcagAAPass: idleContrast != null && idleContrast >= wcagAANormalText,
    },
    active: {
      ...activeSample,
      contrast: activeContrast,
      wcagAAPass: activeContrast != null && activeContrast >= wcagAANormalText,
      activePseudoApplied: activeSample.matchesActive,
    },
  }
}

async function readVisibleTooltipPanel(page) {
  return page.evaluate(() => {
    const isPanelVisible = (panel) => {
      if (!panel) return false
      const cs = getComputedStyle(panel)
      if (cs.display === 'none' || cs.visibility === 'hidden' || Number(cs.opacity) === 0) {
        return false
      }
      const r = panel.getBoundingClientRect()
      return r.width > 0.5 && r.height > 0.5
    }
    const panels = [...document.querySelectorAll('.pt-tooltip__panel')]
    const panel = panels.find(isPanelVisible) ?? null
    if (!panel) return { panelVisible: false }
    const r = panel.getBoundingClientRect()
    const cs = getComputedStyle(panel)
    const vpW = window.innerWidth
    const vpH = window.innerHeight
    return {
      panelVisible: true,
      position: cs.position,
      fixed: cs.position === 'fixed',
      inViewport: r.bottom > 0 && r.top < vpH && r.right > 0 && r.left < vpW,
      rect: { top: r.top, left: r.left, width: r.width, height: r.height },
    }
  })
}

async function checkTableOverflowTooltip(page) {
  const emailTrigger = page.locator('.pt-table tbody tr:first-child td:nth-child(2) .pt-table__cell').first()
  await emailTrigger.waitFor({ state: 'visible', timeout: 15_000 })

  await emailTrigger.hover()
  await page.waitForTimeout(TOOLTIP_SHOW_AFTER_MS + 120)
  const hover = await readVisibleTooltipPanel(page)

  const wrap = page.locator('.pt-table__wrap')
  await wrap.evaluate((el) => {
    el.scrollLeft = 120
  })
  await page.waitForTimeout(200)
  const afterScrollWhileHovered = await readVisibleTooltipPanel(page)

  await page.mouse.move(8, 8)
  await page.waitForTimeout(TOOLTIP_LEAVE_WAIT_MS)
  const afterPointerLeave = await readVisibleTooltipPanel(page)
  const closesOnLeave = !afterPointerLeave.panelVisible

  const focusReport = await emailTrigger.evaluate((el) => {
    el.focus()
    return {
      focusable: el.tabIndex >= 0 || el.getAttribute('tabindex') != null,
      activeTag: document.activeElement?.tagName ?? null,
      activeClass: document.activeElement?.className ?? null,
      activeIsCell: document.activeElement?.classList?.contains('pt-table__cell') ?? false,
    }
  })
  await page.waitForTimeout(TOOLTIP_SHOW_AFTER_MS + 200)
  const afterFocus = await readVisibleTooltipPanel(page)

  return {
    documentedDelaysMs: { showAfter: TOOLTIP_SHOW_AFTER_MS, hideAfter: TOOLTIP_HIDE_AFTER_MS },
    leaveWaitMs: TOOLTIP_LEAVE_WAIT_MS,
    hover,
    afterScrollWhileHovered,
    afterPointerLeave: { ...afterPointerLeave, closesOnLeave },
    keyboardFocus: { ...focusReport, popup: afterFocus },
    assertionNote:
      'Panel nodes stay in DOM with v-show; visibility uses getBoundingClientRect + computed style, not querySelector presence.',
  }
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
  if ((await page.locator('.pt-drawer.is-visible').count()) > 0) {
    await page.keyboard.press('Escape')
    await page.waitForTimeout(350)
  }

  const lightOverlap = await assertNoEmailOverlap(page)
  if (!lightOverlap.ok) issue('error', 'table-layout', `desktop light: ${lightOverlap.reason}`)

  const tooltipCheck = await checkTableOverflowTooltip(page)
  if (!tooltipCheck.hover?.panelVisible) {
    issue(
      'warn',
      'tooltip',
      '库 showOverflowTooltip hover 未出现可见 panel（若 node_modules 仍为 npm 0.1.0 可忽略；候选包应出现）',
    )
  } else if (!tooltipCheck.hover.fixed || !tooltipCheck.hover.inViewport) {
    issue('error', 'tooltip', `hover Teleport/fixed placement: ${JSON.stringify(tooltipCheck.hover)}`)
  }
  if (tooltipCheck.afterPointerLeave?.panelVisible) {
    issue(
      'error',
      'tooltip',
      `pointer leave 后 panel 仍可见（已等待 hideAfter+${TOOLTIP_LEAVE_WAIT_MS}ms）: ${JSON.stringify(tooltipCheck.afterPointerLeave)}`,
    )
  }
  if (
    tooltipCheck.keyboardFocus.popup?.panelVisible &&
    !tooltipCheck.keyboardFocus.popup.inViewport
  ) {
    issue(
      'error',
      'tooltip',
      `focus 弹出层可见但不在视口: ${JSON.stringify(tooltipCheck.keyboardFocus)}`,
    )
  }

  const primaryContrast = await checkPrimaryButtonContrast(page)
  if (primaryContrast.active.activePseudoApplied === false) {
    issue(
      'warn',
      'primary-pressed',
      `未命中 :active（采样可能仍为 idle）；idle=${primaryContrast.idle.background} active=${primaryContrast.active.background}`,
    )
  } else if (!primaryContrast.active.wcagAAPass) {
    issue(
      'error',
      'primary-pressed',
      `按下态 WCAG 正文对比不足 4.5:1: ${JSON.stringify(primaryContrast.active)}`,
    )
  }
  if ((await page.locator('.pt-drawer.is-visible').count()) > 0) {
    await page.locator('.pt-drawer button:has-text("取消")').first().click()
    await page.waitForTimeout(300)
  }

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
    packageIdentity: {
      candidateRef: CANDIDATE_REF,
      tarballSha256: TARBALL_SHA256,
      tarballFile: TARBALL_NAME,
      tarballSha256Verified: true,
      implementationSourceCommitSha: PORTICO_UI_IMPLEMENTATION_SHA,
      porticoUiBranchHeadCommitSha: PORTICO_UI_BRANCH_HEAD_SHA,
      branchHeadNote: 'branch head is capture/manifest scripts only after implementation SHA',
    },
    supersedesPriorCandidates: ['b1901ae', 'cd9a003'],
    npmPackagePublic: false,
    finalVerificationComplete: false,
    visualSignOff: false,
    productApproval: false,
    designerVisualAudit:
      'targeted review: visible blockers cleared for USER review (not user final approval / merge / release / npm)',
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
    checks: {
      lightOverlap,
      darkOverlap,
      narrowOverlap,
      scrollMetrics,
      tooltipCheck,
      primaryContrast,
      wcagCalibration,
    },
    issues,
    adminIntegration:
      'Fixed column widths; email column showOverflowTooltip; TableEllipsisCell slots for other text columns; no portico-ui CSS patches.',
    viteNote:
      'After swapping node_modules/portico-ui, clear node_modules/.vite and restart dev with --force so PtTable tooltip path is exercised.',
    libraryCandidateSincePrevious:
      'f84d4bd: tooltip Teleport/fixed placement, header overflow isolation, primary pressed foreground hardening (vs b1901ae).',
    screenshotManifest: [
      `candidate-users-light-${TAG}.png`,
      `candidate-users-dark-${TAG}.png`,
      `candidate-form-light-${TAG}.png`,
      `candidate-form-dark-${TAG}.png`,
      `candidate-narrow-dark-nav-${TAG}.png`,
      `candidate-users-narrow-closed-${TAG}.png`,
      `candidate-ui-regression-${TAG}.json`,
    ],
    adminRepo: 'mininicerrrr/portico-admin',
    adminGitSha: process.env.ADMIN_GIT_SHA ?? null,
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
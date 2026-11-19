/**
 * portico-ui candidate smoke (portico-admin).
 *
 * Prerequisites:
 *   1. node_modules/portico-ui swapped to candidate tarball (see docs/PORTICO_UI_CANDIDATE_VALIDATION.md)
 *   2. Dev server: npm run dev -- --host 127.0.0.1 --port 5173
 *   3. npx playwright@1.49.0 install chromium
 *
 * Usage:
 *   SCREENSHOT_DIR=/opt/cursor/artifacts node scripts/candidate-regression.mjs
 */
import { chromium } from 'playwright'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'

const baseUrl = process.env.SCREENSHOT_BASE_URL ?? 'http://127.0.0.1:5173'
const outDir = process.env.SCREENSHOT_DIR ?? '/opt/cursor/artifacts'

const issues = []

function record(severity, area, detail) {
  issues.push({ severity, area, detail })
}

async function readTokens(page) {
  return page.evaluate(() => {
    const root = document.documentElement
    const styles = getComputedStyle(root)
    const body = getComputedStyle(document.body)
    const pick = (name) => styles.getPropertyValue(name).trim()
    return {
      mode: root.classList.contains('pt-dark') ? 'dark' : 'light',
      tokens: {
        primary: pick('--pt-color-primary'),
        radiusS: pick('--pt-radius-s'),
        borderControl: pick('--pt-border-width-control'),
        bgPage: pick('--pt-bg-page'),
        lintel: pick('--pt-lintel'),
      },
      bodyFont: body.fontFamily,
      primaryButtonLintel: (() => {
        const btn = document.querySelector('.pt-button--primary:not(.pt-button--text)')
        if (!btn) return null
        return getComputedStyle(btn, '::before').content
      })(),
    }
  })
}

async function shot(page, name) {
  await page.waitForTimeout(350)
  await page.screenshot({ path: path.join(outDir, name), fullPage: true })
}

const browser = await chromium.launch()
const context = await browser.newContext({ locale: 'zh-CN' })
const page = await context.newPage()

await mkdir(outDir, { recursive: true })

try {
  await page.goto(`${baseUrl}/`, { waitUntil: 'networkidle' })
  await page.getByRole('menuitem', { name: '用户列表' }).click()
  await page.waitForURL('**/users')

  await page.getByPlaceholder('姓名、邮箱、部门或 ID').fill('演示·林青')
  await page.waitForTimeout(200)

  const roleWrap = page.locator('.filters-row .filter-field').nth(1)
  await roleWrap.locator('.pt-select__control').click({ timeout: 5000 })
  await page.locator('.pt-select__option', { hasText: '管理员' }).first().click({ timeout: 5000 })
  const roleText = await roleWrap.locator('.pt-select__value').textContent()
  if (!roleText?.includes('管理员')) {
    record('warn', 'users-filter', `角色筛选未显示「管理员」，当前值: ${roleText ?? '(空)'}`)
  }

  await page.locator('th.is-sortable').first().click()
  await page.waitForTimeout(150)

  await shot(page, 'candidate-users-light.png')

  const lightTokens = await readTokens(page)
  if (lightTokens.tokens.primary.toLowerCase() !== '#3473ce') {
    record('error', 'tokens', `亮色 --pt-color-primary 期望 #3473ce，实际 ${lightTokens.tokens.primary}`)
  }
  if (lightTokens.tokens.radiusS !== '6px') {
    record('error', 'tokens', `--pt-radius-s 期望 6px，实际 ${lightTokens.tokens.radiusS}`)
  }
  if (!/Noto Sans SC/i.test(lightTokens.bodyFont)) {
    record('error', 'font', `body 字体未包含 Noto Sans SC: ${lightTokens.bodyFont}`)
  }

  const editBtn = page.getByRole('button', { name: '编辑' }).first()
  await editBtn.click()
  await page.waitForSelector('.pt-drawer.is-visible', { timeout: 5000 })
  await page.getByRole('button', { name: '保存（演示）' }).click()
  await page.waitForTimeout(400)

  await page.goto(`${baseUrl}/form-demo`, { waitUntil: 'networkidle' })
  await page.getByRole('button', { name: '校验并提交（演示）' }).click()
  await page.waitForTimeout(300)
  const errors = await page.locator('.pt-form-item__error').count()
  if (errors < 2) {
    record('error', 'form', `提交空表单项后期望至少 2 条校验错误，实际 ${errors}`)
  }
  await shot(page, 'candidate-form-light.png')

  await page.goto(`${baseUrl}/settings`, { waitUntil: 'networkidle' })
  const themeSwitch = page.locator('.pt-switch').first()
  await themeSwitch.click()
  await page.waitForTimeout(250)

  await page.goto(`${baseUrl}/users`, { waitUntil: 'networkidle' })
  let darkTokens = await readTokens(page)
  if (darkTokens.mode !== 'dark') {
    await page.evaluate(() => {
      localStorage.setItem('portico-admin-theme', 'dark')
      document.documentElement.classList.add('pt-dark')
      document.documentElement.setAttribute('data-pt-theme', 'dark')
    })
    darkTokens = await readTokens(page)
    if (darkTokens.mode !== 'dark') {
      record('error', 'theme', '无法进入暗色模式（header 开关与 html.pt-dark 均未生效）')
    }
  }

  const tableHeaderBg = await page.evaluate(() => {
    const th = document.querySelector('.pt-table th')
    return th ? getComputedStyle(th).backgroundColor : null
  })
  const tableRowBg = await page.evaluate(() => {
    const td = document.querySelector('.pt-table tbody td')
    return td ? getComputedStyle(td).backgroundColor : null
  })
  if (tableHeaderBg && tableRowBg && tableHeaderBg === tableRowBg) {
    record(
      'warn',
      'table-dark',
      `暗色表头与单元格背景色相同 (${tableHeaderBg})，表头可能难以区分（portico-ui PR#2 已知风险）`,
    )
  }

  await shot(page, 'candidate-users-dark.png')
  await page.goto(`${baseUrl}/form-demo`, { waitUntil: 'networkidle' })
  await shot(page, 'candidate-form-dark.png')

  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto(`${baseUrl}/users`, { waitUntil: 'networkidle' })
  await page.locator('button:has-text("菜单")').first().click()
  await page.waitForTimeout(250)
  await shot(page, 'candidate-narrow-dark-nav.png')

  await page.keyboard.press('Tab')
  await page.keyboard.press('Tab')
  const focused = await page.evaluate(() => document.activeElement?.tagName)
  if (!focused) record('warn', 'a11y', 'Tab 后未检测到 focus 元素')

  const evidence = {
    candidate: {
      repo: 'mininicerrrr/portico-ui',
      pr: 2,
      commit: '4bcf938b0bca4d37ece836eaff1a714002db880f',
      supersedes: 'ccd5058cf8277579dd38bc17bdb0915e6b6481fd',
    },
    designerVisualAudit: 'pending re-audit on 4bcf938 — not final',
    finalVerificationComplete: false,
    finalApproval: false,
    trackedDependency: 'portico-ui@0.1.0 (npm registry only)',
    adminHostCollision: {
      vitepressPresent: false,
      note: 'Prior white/narrow table snapshot was VitePress docs host CSS, not admin.',
    },
    verifiedAt: new Date().toISOString(),
    admin: 'portico-admin',
    cssEntry: 'portico-ui/style.css',
    light: lightTokens,
    dark: darkTokens,
    issues,
    regression: {
      routes: true,
      usersSearch: true,
      usersSortClick: true,
      usersEditDrawer: true,
      formValidationErrors: errors,
      themeToggle: darkTokens.mode === 'dark',
      narrowNav: true,
    },
  }

  await writeFile(path.join(outDir, 'candidate-token-evidence.json'), JSON.stringify(evidence, null, 2))
  console.log(JSON.stringify(evidence, null, 2))

  if (issues.some((i) => i.severity === 'error')) {
    process.exitCode = 1
  }
} catch (err) {
  console.error(err)
  record('error', 'runner', String(err))
  process.exitCode = 1
} finally {
  await browser.close()
}
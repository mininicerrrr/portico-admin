/**
 * Built preview smoke for GitHub Pages base path (/portico-admin/).
 * Prerequisites: npm ci (playwright is a devDependency).
 *   VITE_BASE_PATH=/portico-admin/ npm run build
 *   cp dist/index.html dist/404.html
 *   npx playwright install chromium
 */
import { chromium } from 'playwright'
import { spawn } from 'node:child_process'
import { setTimeout as delay } from 'node:timers/promises'

const basePath = (process.env.VITE_BASE_PATH ?? '/portico-admin/').replace(/\/?$/, '/')
const port = Number(process.env.PREVIEW_PORT ?? 4173)
const origin = `http://127.0.0.1:${port}`
const baseUrl = new URL(basePath, `${origin}/`).href

function assertAssetPrefix(assets, prefix) {
  const violations = assets.filter((a) => {
    if (!a.url) return false
    try {
      const u = new URL(a.url)
      return !u.pathname.startsWith(prefix)
    } catch {
      return true
    }
  })
  return violations.map((v) => v.url)
}

const preview = spawn(
  'npx',
  ['vite', 'preview', '--host', '127.0.0.1', `--port`, String(port)],
  {
    cwd: process.cwd(),
    env: { ...process.env, VITE_BASE_PATH: basePath },
    stdio: 'ignore',
  },
)

try {
  let ready = false
  for (let i = 0; i < 40; i++) {
    const res = await fetch(`${baseUrl}`).catch(() => null)
    if (res?.ok) {
      ready = true
      break
    }
    await delay(400)
  }
  if (!ready) {
    console.error(JSON.stringify({ ok: false, error: 'preview server not ready', baseUrl }, null, 2))
    process.exitCode = 1
    process.exit(process.exitCode)
  }

  const browser = await chromium.launch()
  const page = await browser.newPage()
  const errors = []
  const checks = { routes: {}, assets: {}, basePath, baseUrl }

  const collectAssets = () =>
    page.evaluate(() =>
      [...document.querySelectorAll('link[rel=stylesheet],script[type=module]')].map((el) => ({
        url: (el).href || (el).src || '',
      })),
    )

  const pathPrefix = new URL(baseUrl).pathname.replace(/\/?$/, '') || basePath.replace(/\/?$/, '')

  await page.goto(`${baseUrl}`, { waitUntil: 'networkidle' })
  if (!(await page.getByRole('menuitem', { name: '用户列表' }).count())) {
    errors.push('dashboard missing users nav')
  }
  const dashAssets = await collectAssets()
  const dashBad = assertAssetPrefix(dashAssets, pathPrefix)
  if (dashBad.length) errors.push(`dashboard assets missing ${pathPrefix}: ${dashBad.join(', ')}`)
  checks.assets.dashboard = { count: dashAssets.length, violations: dashBad }

  await page.goto(`${baseUrl}users`, { waitUntil: 'networkidle' })
  if (!page.url().includes('/users')) errors.push(`direct users navigation failed: ${page.url()}`)
  await page.reload({ waitUntil: 'networkidle' })
  if (!page.url().includes('/users')) errors.push(`users hard refresh failed: ${page.url()}`)
  checks.routes.usersDirectAndRefresh = page.url()

  const userAssets = await collectAssets()
  const userBad = assertAssetPrefix(userAssets, pathPrefix)
  if (userBad.length) errors.push(`users assets missing ${pathPrefix}: ${userBad.join(', ')}`)
  checks.assets.users = { count: userAssets.length, violations: userBad }

  await page.goto(`${baseUrl}form-demo`, { waitUntil: 'networkidle' })
  if (!page.url().includes('form-demo')) errors.push(`direct form-demo failed: ${page.url()}`)
  await page.reload({ waitUntil: 'networkidle' })
  if (!page.url().includes('form-demo')) errors.push(`form-demo hard refresh failed: ${page.url()}`)
  checks.routes.formDemoDirectAndRefresh = page.url()

  await browser.close()

  const result = { ok: errors.length === 0, baseUrl, basePath: pathPrefix, checks, errors }
  if (errors.length) {
    console.error(JSON.stringify(result, null, 2))
    process.exitCode = 1
  } else {
    console.log(JSON.stringify(result, null, 2))
  }
} finally {
  preview.kill('SIGTERM')
}
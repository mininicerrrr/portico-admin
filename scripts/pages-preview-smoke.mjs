/**
 * Built preview smoke for GitHub Pages base path (/portico-admin/).
 * Expects: VITE_BASE_PATH=/portico-admin/ npm run build && cp dist/index.html dist/404.html
 * Run: node scripts/pages-preview-smoke.mjs
 */
import { chromium } from 'playwright'
import { spawn } from 'node:child_process'
import { setTimeout as delay } from 'node:timers/promises'

const basePath = process.env.VITE_BASE_PATH ?? '/portico-admin/'
const port = Number(process.env.PREVIEW_PORT ?? 4173)
const baseUrl = `http://127.0.0.1:${port}${basePath}`.replace(/\/+$/, '/')

const preview = spawn('npx', ['vite', 'preview', '--host', '127.0.0.1', `--port`, String(port)], {
  cwd: process.cwd(),
  env: { ...process.env, VITE_BASE_PATH: basePath },
  stdio: 'ignore',
})

try {
  for (let i = 0; i < 30; i++) {
    const res = await fetch(baseUrl).catch(() => null)
    if (res?.ok) break
    await delay(500)
  }

  const browser = await chromium.launch()
  const page = await browser.newPage({ baseURL: baseUrl })
  const errors = []

  await page.goto('./', { waitUntil: 'networkidle' })
  if (!(await page.getByRole('menuitem', { name: '用户列表' }).count())) {
    errors.push('dashboard missing users nav')
  }

  await page.goto('./users', { waitUntil: 'networkidle' })
  if (!page.url().includes('/users')) errors.push(`direct users navigation failed: ${page.url()}`)

  const assetOk = await page.evaluate(() =>
    [...document.querySelectorAll('link[rel=stylesheet],script[type=module]')].every((el) => {
      const href = el.href || el.src
      return !href || href.startsWith(window.location.origin)
    }),
  )
  if (!assetOk) errors.push('asset URLs not rooted under preview origin')

  await page.goto('./form-demo', { waitUntil: 'networkidle' })
  if (!page.url().includes('form-demo')) errors.push(`direct form-demo failed: ${page.url()}`)

  await browser.close()
  if (errors.length) {
    console.error(JSON.stringify({ ok: false, baseUrl, errors }, null, 2))
    process.exitCode = 1
  } else {
    console.log(JSON.stringify({ ok: true, baseUrl, basePath }, null, 2))
  }
} finally {
  preview.kill('SIGTERM')
}
/**
 * Static-host regression: direct GET must be HTTP 200 (no Vite preview SPA fallback).
 */
import { chromium } from 'playwright'
import { writeFile } from 'node:fs/promises'
import path from 'node:path'
import { setTimeout as delay } from 'node:timers/promises'
import { server, port, basePath } from './static-dist-server.mjs'

const baseUrl = `http://127.0.0.1:${port}${basePath}`
const outDir = process.env.SCREENSHOT_DIR ?? '/opt/cursor/artifacts'

const ROUTES = [
  { path: '', name: 'dashboard', selector: 'role=menuitem[name="用户列表"]' },
  { path: 'users', name: 'users', selector: '.pt-table' },
  { path: 'form-demo', name: 'form-demo', selector: '.pt-form' },
  { path: 'settings', name: 'settings', selector: 'text=外观主题' },
]

async function httpGet(pathSuffix) {
  const url = `${baseUrl}${pathSuffix}`.replace(/([^:]\/)\/+/g, '$1')
  const res = await fetch(url, { redirect: 'manual' })
  const bodySnippet = (await res.text()).slice(0, 120)
  return { url, status: res.status, ok: res.ok, contentType: res.headers.get('content-type'), bodySnippet }
}

server.listen(port, '127.0.0.1')

try {
  await delay(300)
  const httpChecks = {}
  const errors = []
  for (const r of ROUTES) {
    const key = r.name
    httpChecks[key] = await httpGet(r.path)
    if (httpChecks[key].status !== 200) {
      errors.push(`${key} direct GET expected 200 got ${httpChecks[key].status} (${httpChecks[key].url})`)
    }
    const withQuery = await httpGet(`${r.path}?qa=1`)
    httpChecks[`${key}?qa=1`] = withQuery
    if (withQuery.status !== 200) errors.push(`${key}?qa=1 GET ${withQuery.status}`)
  }
  const unknown = await httpGet('this-route-does-not-exist')
  httpChecks.unknown = unknown

  const browser = await chromium.launch()
  const page = await browser.newPage()
  const browserChecks = {}

  for (const r of ROUTES) {
    const url = `${baseUrl}${r.path}`.replace(/([^:]\/)\/+/g, '$1')
    await page.goto(url, { waitUntil: 'networkidle' })
    const visible = (await page.locator(r.selector).count()) > 0
    browserChecks[r.name] = { url: page.url(), selector: r.selector, visible }
    if (!visible) errors.push(`${r.name} missing UI: ${r.selector}`)
    if (r.path && !page.url().includes(`/${r.path}`)) {
      errors.push(`${r.name} browser url lost path: ${page.url()}`)
    }
    await page.reload({ waitUntil: 'networkidle' })
    browserChecks[`${r.name}-reload`] = { url: page.url() }
  }

  await page.goto(`${baseUrl}users`, { waitUntil: 'networkidle' })
  await page.getByRole('menuitem', { name: '示例表单' }).click()
  await page.waitForURL(/form-demo/)
  browserChecks.navUsersToForm = page.url()

  const assets = await page.evaluate(() =>
    [...document.querySelectorAll('link[rel=stylesheet],script[type=module]')].map((el) => ({
      url: el.href || el.src,
    })),
  )
  const prefix = new URL(baseUrl).pathname.replace(/\/?$/, '')
  const badAssets = assets.filter((a) => a.url && !new URL(a.url).pathname.startsWith(prefix))
  if (badAssets.length) errors.push(`assets outside ${prefix}: ${badAssets.map((a) => a.url).join(', ')}`)

  await browser.close()

  const evidence = {
    verifiedAt: new Date().toISOString(),
    server: 'static-dist-server (no SPA fallback)',
    baseUrl,
    basePath,
    httpChecks,
    browserChecks,
    assetPrefix: prefix,
    assetViolations: badAssets,
    errors,
    ok: errors.length === 0,
    compatibilityNote: {
      supportedDirectGet200: ROUTES.map((r) => `${basePath}${r.path}`.replace(/\/$/, '') || basePath),
      unknownPaths: 'Static host returns HTTP 404; 404.html may show shell but status stays 404 on GitHub Pages.',
      hashUrls: 'Not used (history mode); old hash bookmarks not supported.',
    },
  }

  await writeFile(path.join(outDir, 'pages-static-route-regression.json'), JSON.stringify(evidence, null, 2))
  console.log(JSON.stringify(evidence, null, 2))
  if (errors.length) process.exitCode = 1
} finally {
  server.close()
}
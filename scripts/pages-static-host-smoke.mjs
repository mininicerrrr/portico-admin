/**
 * Static-host regression: direct GET must be HTTP 200 (no Vite preview SPA fallback).
 */
import { chromium } from 'playwright'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { setTimeout as delay } from 'node:timers/promises'
import { server, port, basePath } from './static-dist-server.mjs'

const baseUrl = `http://127.0.0.1:${port}${basePath}`
const outDir = process.env.SCREENSHOT_DIR ?? path.join(process.cwd(), 'pages-static-route-regression')

const ROUTES = [
  { path: '', name: 'dashboard', selector: 'role=menuitem[name="用户列表"]' },
  { path: 'users', name: 'users', selector: '.pt-table' },
  { path: 'form-demo', name: 'form-demo', selector: '.pt-form' },
  { path: 'settings', name: 'settings', selector: 'text=外观主题' },
]

function buildUrl(pathSuffix) {
  return `${baseUrl}${pathSuffix}`.replace(/([^:]\/)\/+/g, '$1')
}

/** First response only (no redirect follow) — matches curl -I first hop. */
async function httpGetFirst(pathSuffix) {
  const url = buildUrl(pathSuffix)
  const res = await fetch(url, { redirect: 'manual' })
  const bodySnippet = (await res.text()).slice(0, 120)
  return {
    url,
    firstStatus: res.status,
    location: res.headers.get('location'),
    contentType: res.headers.get('content-type'),
    bodySnippet,
  }
}

/** After following redirects (browser default navigation). */
async function httpGetFollowed(pathSuffix) {
  const url = buildUrl(pathSuffix)
  const res = await fetch(url, { redirect: 'follow' })
  const bodySnippet = (await res.text()).slice(0, 120)
  return {
    requestUrl: url,
    finalUrl: res.url,
    finalStatus: res.status,
    contentType: res.headers.get('content-type'),
    bodySnippet,
  }
}

server.listen(port, '127.0.0.1')

try {
  await delay(300)
  const httpChecks = {}
  const errors = []
  for (const r of ROUTES) {
    const key = r.name
    const first = await httpGetFirst(r.path)
    const followed = await httpGetFollowed(r.path)
    httpChecks[key] = { first, followed }
    if (first.firstStatus !== 200) {
      errors.push(`${key} first GET expected 200 got ${first.firstStatus} (${first.url})`)
    }
    if (followed.finalStatus !== 200) {
      errors.push(`${key} followed GET expected 200 got ${followed.finalStatus}`)
    }
    const withQuery = await httpGetFirst(`${r.path}?qa=1`)
    httpChecks[`${key}?qa=1`] = { first: withQuery }
    if (withQuery.firstStatus !== 200) errors.push(`${key}?qa=1 first GET ${withQuery.firstStatus}`)
  }
  if (ROUTES.some((r) => r.path === 'users')) {
    const slashFirst = await httpGetFirst('users/')
    const slashFollowed = await httpGetFollowed('users/')
    httpChecks['users-trailing-slash'] = { first: slashFirst, followed: slashFollowed }
    if (slashFirst.firstStatus !== 200) {
      errors.push(`users/ first GET expected 200 got ${slashFirst.firstStatus}`)
    }
  }
  const unknown = await httpGetFirst('this-route-does-not-exist')
  httpChecks.unknown = unknown

  const liveProbe = {}
  if (process.env.PAGES_LIVE_PROBE === '1') {
    const liveBase = 'https://mininicerrrr.github.io/portico-admin/'
    for (const suffix of ['', 'users', 'users/', 'users?qa=1']) {
      const u = new URL(suffix, liveBase).href
      const first = await fetch(u, { redirect: 'manual' })
      const followed = await fetch(u, { redirect: 'follow' })
      liveProbe[suffix || '/'] = {
        note: 'read-only; does not fail CI — current production may still 404 before merge+deploy',
        firstStatus: first.status,
        location: first.headers.get('location'),
        finalStatus: followed.status,
        finalUrl: followed.url,
      }
    }
  }

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
  await page.waitForSelector('.pt-table', { timeout: 15000 })

  const usersFilterA11y = { comboboxByRole: {}, treeComboboxNames: [], interactions: {} }
  const distinctComboboxNames = ['角色筛选', '状态筛选', '每页条数']
  for (const name of distinctComboboxNames) {
    const count = await page.getByRole('combobox', { name }).count()
    usersFilterA11y.comboboxByRole[name] = count
    if (count !== 1) errors.push(`users combobox getByRole count for "${name}" expected 1 got ${count}`)
  }
  const a11yTree = await page.accessibility.snapshot({ interestingOnly: true })
  function collectComboboxNames(node, out = []) {
    if (!node) return out
    if (node.role === 'combobox') out.push(node.name ?? null)
    for (const child of node.children || []) collectComboboxNames(child, out)
    return out
  }
  usersFilterA11y.treeComboboxNames = collectComboboxNames(a11yTree)
  const unnamed = usersFilterA11y.treeComboboxNames.filter((n) => !n)
  if (unnamed.length) {
    errors.push(`users accessibility tree has unnamed comboboxes: ${JSON.stringify(usersFilterA11y.treeComboboxNames)}`)
  }
  await page.getByRole('combobox', { name: '角色筛选' }).click()
  await page.getByRole('option', { name: '管理员' }).click()
  usersFilterA11y.interactions.roleAdmin = true
  await page.getByRole('combobox', { name: '状态筛选' }).click()
  await page.getByRole('option', { name: '启用' }).click()
  usersFilterA11y.interactions.statusActive = true
  await page.getByRole('combobox', { name: '每页条数' }).selectOption('20')
  const pageSizeValue = await page.getByRole('combobox', { name: '每页条数' }).inputValue()
  usersFilterA11y.interactions.pageSize20 = pageSizeValue === '20'
  if (pageSizeValue !== '20') errors.push(`users page size select expected 20 got ${pageSizeValue}`)
  browserChecks.usersFilterA11y = usersFilterA11y

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
    liveProductionProbe: Object.keys(liveProbe).length ? liveProbe : undefined,
    browserChecks,
    assetPrefix: prefix,
    assetViolations: badAssets,
    errors,
    ok: errors.length === 0,
    compatibilityNote: {
      regressionScope:
        'Asserts first-response HTTP status on local static host only — not a claim that github.io already returns 200.',
      githubPagesTrailingSlash:
        'Live GitHub Pages may respond 301/302 before 200 for directory URLs; record first vs final separately when probing production.',
      supportedDirectGet200: ROUTES.map((r) => `${basePath}${r.path}`.replace(/\/$/, '') || basePath),
      unknownPaths: 'Static host returns HTTP 404; 404.html may show shell but status stays 404 on GitHub Pages.',
      hashUrls: 'Not used (history mode); old hash bookmarks not supported.',
    },
  }

  await mkdir(outDir, { recursive: true })
  await writeFile(path.join(outDir, 'pages-static-route-regression.json'), JSON.stringify(evidence, null, 2))
  console.log(JSON.stringify(evidence, null, 2))
  if (errors.length) process.exitCode = 1
} finally {
  server.close()
}
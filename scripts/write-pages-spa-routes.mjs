/**
 * GitHub Pages (static) has no server-side history fallback for project sites.
 * Emit index.html copies at each Vue route segment so direct GET returns HTTP 200.
 */
import { cp, mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

const distDir = path.resolve(process.cwd(), process.env.PAGES_DIST_DIR ?? 'dist')
const indexPath = path.join(distDir, 'index.html')

/** App child routes (history mode, no leading slash) — keep in sync with src/router/index.ts */
export const PAGES_SPA_ROUTE_SEGMENTS = ['users', 'form-demo', 'settings']

async function main() {
  const indexHtml = await readFile(indexPath, 'utf8')
  const written = []
  for (const segment of PAGES_SPA_ROUTE_SEGMENTS) {
    const dir = path.join(distDir, segment)
    await mkdir(dir, { recursive: true })
    const target = path.join(dir, 'index.html')
    await writeFile(target, indexHtml)
    written.push({ segment, file: `${segment}/index.html` })
  }
  await cp(indexPath, path.join(distDir, '404.html'))
  const manifest = {
    distDir,
    routeSegments: PAGES_SPA_ROUTE_SEGMENTS,
    written,
    note: '404.html remains for unknown paths; GitHub Pages may still respond HTTP 404 with that body.',
  }
  const out = process.env.REGRESSION_OUT
  if (out) await writeFile(out, JSON.stringify(manifest, null, 2))
  console.log(JSON.stringify(manifest, null, 2))
}

main().catch((err) => {
  console.error(err)
  process.exitCode = 1
})
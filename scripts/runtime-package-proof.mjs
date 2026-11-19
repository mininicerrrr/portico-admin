/**
 * Hash installed portico-ui dist files + summarize browser-loaded portico-ui resources.
 */
import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import path from 'node:path'

const ROOT = process.cwd()
const PKG_DIR = path.join(ROOT, 'node_modules/portico-ui')

export async function hashInstalledPorticoUi(distFiles = ['portico-ui.es.js', 'style.css', 'index.d.ts']) {
  const pkg = JSON.parse(await readFile(path.join(PKG_DIR, 'package.json'), 'utf8'))
  const fileSha256 = {}
  for (const name of distFiles) {
    const buf = await readFile(path.join(PKG_DIR, 'dist', name))
    fileSha256[name] = createHash('sha256').update(buf).digest('hex')
  }
  return {
    packageName: pkg.name,
    installedVersion: pkg.version,
    fileSha256,
  }
}

/** Attach before navigation; call finishAfterIdle() when network settles. */
export function createPorticoUiResponseCollector(page) {
  const captured = []
  const handler = async (response) => {
    const url = response.url()
    if (!/portico-ui|deps\/portico-ui/i.test(url)) return
    try {
      const body = await response.body()
      captured.push({
        url,
        status: response.status(),
        sha256: createHash('sha256').update(body).digest('hex'),
        byteLength: body.length,
      })
    } catch {
      captured.push({ url, status: response.status(), sha256: null, byteLength: null })
    }
  }
  page.on('response', handler)
  return {
    getCaptured: () => [...captured],
    detach: () => page.off('response', handler),
  }
}
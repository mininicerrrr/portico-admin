/**
 * Minimal static file server — NO SPA fallback (unlike vite preview).
 * Used to regression-test GitHub Pages–style direct GET behavior.
 */
import http from 'node:http'
import { readFile, stat } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const distDir = path.resolve(process.cwd(), process.env.PAGES_DIST_DIR ?? 'dist')
const port = Number(process.env.STATIC_DIST_PORT ?? 4321)
const basePath = (process.env.VITE_BASE_PATH ?? '/portico-admin/').replace(/\/?$/, '/')

const mime = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.json': 'application/json',
}

function resolveFile(urlPath) {
  const baseNoTrail = basePath.replace(/\/$/, '')
  let rel = urlPath
  if (rel === baseNoTrail || rel === `${baseNoTrail}/`) rel = '/'
  else if (rel.startsWith(`${baseNoTrail}/`)) rel = rel.slice(baseNoTrail.length)
  else if (rel.startsWith(basePath)) rel = rel.slice(basePath.length - 1)
  else return null
  if (rel === '/' || rel === '') rel = '/index.html'
  else if (rel.endsWith('/')) rel += 'index.html'
  else if (!path.extname(rel)) rel = path.join(rel, 'index.html').replace(/\\/g, '/')
  const relPath = rel.startsWith('/') ? rel.slice(1) : rel
  const filePath = path.normalize(path.join(distDir, relPath))
  if (!filePath.startsWith(distDir)) return null
  return filePath
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url ?? '/', `http://127.0.0.1:${port}`)
    const filePath = resolveFile(url.pathname)
    if (!filePath) {
      res.writeHead(403)
      res.end()
      return
    }
    let st
    try {
      st = await stat(filePath)
    } catch {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' })
      res.end('Not Found')
      return
    }
    if (st.isDirectory()) {
      const indexPath = path.join(filePath, 'index.html')
      try {
        await stat(indexPath)
        const body = await readFile(indexPath)
        res.writeHead(200, { 'Content-Type': mime['.html'] })
        res.end(body)
        return
      } catch {
        res.writeHead(404)
        res.end()
        return
      }
    }
    const ext = path.extname(filePath)
    const body = await readFile(filePath)
    res.writeHead(200, { 'Content-Type': mime[ext] ?? 'application/octet-stream' })
    res.end(body)
  } catch {
    res.writeHead(500)
    res.end()
  }
})

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  server.listen(port, '127.0.0.1', () => {
    console.log(JSON.stringify({ listening: true, port, basePath, distDir }))
  })
}

export { server, port, basePath, distDir }
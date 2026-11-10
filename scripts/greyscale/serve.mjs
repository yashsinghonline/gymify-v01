#!/usr/bin/env node
// A small static server for a built frontend (frontend/dist), for looking at the app without the
// API: `node scripts/greyscale/serve.mjs frontend/dist 4173`. Nothing but Node is needed.
//
// It answers byte ranges, which a <video> asks for (the exercise animations), and never tells the
// browser to keep a file, so a rebuild shows on the next reload. Not meant for the internet: use
// upstream's docker-compose.yml or any real web server for that.
import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'

const root = path.resolve(process.argv[2] || 'frontend/dist')
const port = Number(process.argv[3]) || 4173
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.webmanifest': 'application/manifest+json',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.gif': 'image/gif', '.ico': 'image/x-icon',
  '.mp4': 'video/mp4', '.woff2': 'font/woff2', '.wasm': 'application/wasm', '.md': 'text/markdown; charset=utf-8', '.txt': 'text/plain; charset=utf-8',
}

if (!fs.existsSync(path.join(root, 'index.html'))) {
  console.error(`No index.html in ${root}. Build first: cd frontend && VITE_DEMO=1 npx vite build`)
  process.exit(1)
}

http.createServer((req, res) => {
  let rel
  try { rel = decodeURIComponent((req.url || '/').split(/[?#]/)[0]) } catch { res.writeHead(400).end(); return }
  if (rel.endsWith('/')) rel += 'index.html'
  const file = path.join(root, rel)
  // path.join has resolved any '..': what is left must still be inside the folder being served.
  if (file !== root && !file.startsWith(root + path.sep)) { res.writeHead(403).end(); return }
  let stat
  try { stat = fs.statSync(file) } catch { stat = null }
  if (!stat || !stat.isFile()) { res.writeHead(404, { 'Content-Type': 'text/plain' }).end('Not found'); return }
  if (req.method !== 'GET' && req.method !== 'HEAD') { res.writeHead(405, { Allow: 'GET, HEAD' }).end(); return }

  const head = {
    'Content-Type': TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream',
    'Cache-Control': 'no-cache',
    'Accept-Ranges': 'bytes',
  }
  const range = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range || '')
  if (range && (range[1] || range[2])) {
    const start = range[1] ? Number(range[1]) : Math.max(0, stat.size - Number(range[2]))
    const end = range[1] && range[2] ? Math.min(Number(range[2]), stat.size - 1) : stat.size - 1
    if (start > end || start >= stat.size) { res.writeHead(416, { 'Content-Range': `bytes */${stat.size}` }).end(); return }
    res.writeHead(206, { ...head, 'Content-Range': `bytes ${start}-${end}/${stat.size}`, 'Content-Length': end - start + 1 })
    if (req.method === 'HEAD') { res.end(); return }
    fs.createReadStream(file, { start, end }).pipe(res)
    return
  }
  res.writeHead(200, { ...head, 'Content-Length': stat.size })
  if (req.method === 'HEAD') { res.end(); return }
  fs.createReadStream(file).pipe(res)
}).listen(port, '0.0.0.0', () => console.log(`Serving ${root} on http://0.0.0.0:${port}`))

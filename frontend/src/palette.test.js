// The fork's colour rule, kept by a test: the web app is the design's palette and nothing else
// (DESIGN.md, Colors; the values are lib/brand.js PALETTE and ACCENT).
//
//   chrome   neutrals, and the cool near-neutrals of the design's surface stack: a colour whose
//            channels run r <= g <= b and lie within 20 of each other. Free to use anywhere.
//   signal   the lime ramp and the red. Written down in four files only (SIGNAL_HOMES); everything
//            else reaches them through a token, so the single accent stays single.
//
// Everything on screen is drawn from tokens (index.css) or from a literal in a stylesheet, a
// component or a print document. If none of those names another colour, nothing can show one.
// A merge from upstream that brings a new accent, chart colour or seasonal theme fails here with
// the file and line; `node scripts/greyscale/desaturate.mjs <file>` rewrites it to a first draft.
//
// What this cannot see is said in DESIGN.md: pictures (handled with a filter in index.css),
// the colour emoji of the system font (handled by mono-emoji.css) and the native shells.
import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { findColours, isGrey, luminanceGrey, parseColour } from '../../scripts/greyscale/colours.mjs'
import { ACCENT, PALETTE } from './lib/brand.js'
import { ACCENTS, ACCENT_INK } from './lib/format.js'

const SRC = path.dirname(fileURLToPath(import.meta.url))
const FRONTEND = path.resolve(SRC, '..')

// Files that describe colour which is not this app's to draw.
const NOT_OURS = new Map([
  // The home-screen icons of the phone apps, as upstream drew them: the files live in the native
  // projects, which this fork leaves alone. Greying the list would make the picker lie.
  ['src/lib/app-icon-variants.js', 'the native icon sets, not redrawn in this fork'],
])

// Chrome: a neutral, or a cool near-neutral in the family of the design's surface stack.
const isChrome = ([r, g, b]) => r <= g && g <= b && b - r <= 20
// Signal: the lime ramp and the two reds, by channel values, so an rgba() of one counts as it.
const key = rgb => rgb.join(',')
const SIGNAL = new Set([...PALETTE.chart, ...Object.values(ACCENT), PALETTE.dark.error, PALETTE.light.error]
  .map(v => parseColour(v).rgb).filter(rgb => !isChrome(rgb)).map(key))
// Where a signal colour may be written: its definition, the tokens, the key the native side is
// handed, and the boot screen (index.html has no stylesheet to read a token from).
const SIGNAL_HOMES = new Set(['src/lib/brand.js', 'src/index.css', 'src/lib/format.js', 'index.html'])
const allowed = (file, hit) => {
  const rgb = parseColour(hit.text).rgb
  return isChrome(rgb) || (SIGNAL_HOMES.has(file) && SIGNAL.has(key(rgb)))
}

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name)
    if (e.isDirectory()) walk(p, out)
    else if (/\.(?:css|jsx?|mjs)$/.test(e.name) && !/\.test\.[a-z]+$/.test(e.name)) out.push(p)
  }
  return out
}
const rel = p => path.relative(FRONTEND, p).split(path.sep).join('/')
const files = [
  ...walk(SRC),
  ...['index.html', 'public/manifest.json', 'public/sw.js'].map(f => path.join(FRONTEND, f)),
]

describe('the colour finder', () => {
  it('reads the notations the app uses', () => {
    expect(parseColour('#a3e635').rgb).toEqual([163, 230, 53])
    expect(parseColour('#fff').rgb).toEqual([255, 255, 255])
    expect(parseColour('rgba(10,132,255,.4)').rgb).toEqual([10, 132, 255])
  })
  it('knows a grey from a colour', () => {
    expect(isGrey([140, 140, 140])).toBe(true)
    expect(isGrey([140, 141, 140])).toBe(false)
  })
  it('keeps the lightness when it greys one', () => {
    expect(luminanceGrey([255, 255, 255])).toBe(255)
    expect(luminanceGrey([0, 0, 0])).toBe(0)
    // Lime is a light colour, blue a dark one: the greys must not come out alike.
    expect(luminanceGrey([163, 230, 53])).toBeGreaterThan(luminanceGrey([10, 132, 255]) + 50)
  })
  it('finds a colour in CSS and in a JS string, and leaves an issue number in a comment alone', () => {
    expect(findColours('a{color:#ff0000}', 'x.css').filter(h => !h.grey).map(h => h.text)).toEqual(['#ff0000'])
    expect(findColours("const c = '#00ff00'", 'x.js').filter(h => !h.grey).map(h => h.text)).toEqual(['#00ff00'])
    expect(findColours('// fixed in #454\nconst n = 1', 'x.js')).toEqual([])
    expect(findColours('/* was #a3e635 */ a{color:#111}', 'x.css').filter(h => !h.grey)).toEqual([])
  })
})

describe('the palette', () => {
  it('looks at the whole app', () => {
    expect(files.length).toBeGreaterThan(400)
    expect(files.map(rel)).toEqual(expect.arrayContaining(['src/index.css', 'src/design.css', 'src/coach.css', 'src/lib/card-draw.js', 'src/lib/report-print.js']))
  })

  it('tells chrome from colour', () => {
    for (const v of Object.values(PALETTE.dark).concat(Object.values(PALETTE.light))) {
      if (v === PALETTE.dark.error || v === PALETTE.light.error) continue
      expect(isChrome(parseColour(v).rgb), v).toBe(true)
    }
    expect(isChrome([140, 140, 140])).toBe(true)
    for (const v of ['#ccff00', '#ff3b30', '#0a84ff', '#30d158', '#1c1c1e', '#f2f2f7', '#ffd60a']) expect(isChrome(parseColour(v).rgb), v).toBe(v === '#1c1c1e' || v === '#f2f2f7')
    // a warm grey is not chrome: the stack is cool
    expect(isChrome([34, 30, 28])).toBe(false)
  })

  it('no stylesheet, component or print document names a colour outside the palette', () => {
    const found = []
    for (const f of files) {
      if (NOT_OURS.has(rel(f))) continue
      for (const h of findColours(fs.readFileSync(f, 'utf8'), f)) if (!h.grey && !allowed(rel(f), h)) found.push(`${rel(f)}:${h.line}  ${h.text}`)
    }
    expect(found).toEqual([])
  })

  it('the exceptions are still there and still coloured (or they should leave the list)', () => {
    for (const f of NOT_OURS.keys()) {
      const hits = findColours(fs.readFileSync(path.join(FRONTEND, f), 'utf8'), f)
      expect(hits.some(h => !h.grey && !isChrome(parseColour(h.text).rgb)), f).toBe(true)
    }
  })

  it('the stylesheet agrees with brand.js about every colour of the design', () => {
    const css = fs.readFileSync(path.join(SRC, 'index.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')
    expect(css).not.toMatch(/\[data-accent=/)
    const decls = sel => css.match(new RegExp(`(?:^|\\})\\s*${sel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*\\{([^}]*)\\}`))?.[1] || ''
    const tok = (block, name) => block.match(new RegExp(`${name}:\\s*([^;}]+)`))?.[1]?.trim()
    const dark = decls(':root'), light = decls(':root[data-theme="light"]')
    for (const [block, p] of [[dark, PALETTE.dark], [light, PALETTE.light]]) {
      expect(tok(block, '--bg')).toBe(p.bg)
      expect(tok(block, '--surface')).toBe(p.surface)
      expect(tok(block, '--border')).toBe(p.border)
      expect(tok(block, '--red')).toBe(p.error)
    }
    expect(tok(dark, '--surface-3')).toBe(PALETTE.dark.muted)
    expect(tok(light, '--surface-2')).toBe(PALETTE.light.muted)
    expect(tok(dark, '--label')).toBe(PALETTE.dark.ink)
    expect(tok(dark, '--label-2')).toBe(PALETTE.dark.ink2)
    expect(tok(light, '--label')).toBe(PALETTE.light.ink)
    expect(tok(light, '--ink-soft')).toBe(PALETTE.light.ink2)
    // the accent: the lime, and the darker steps of its ramp the light theme needs
    expect(tok(dark, '--acc')).toBe(ACCENT.dark)
    expect(tok(dark, '--acc-2')).toBe(ACCENT.pressed)
    expect(tok(dark, '--on-acc')).toBe(ACCENT.ink)
    expect(tok(dark, '--acc-ink')).toBe('var(--acc)')
    expect(tok(light, '--acc')).toBe(ACCENT.light)
    expect(tok(light, '--acc-2')).toBe(ACCENT.lightPressed)
    expect(tok(light, '--acc-ink')).toBe(ACCENT.lightText)
    expect(tok(light, '--on-acc')).toBe(ACCENT.ink)
    expect([ACCENT.dark, ACCENT.light, ACCENT.lightPressed, ACCENT.lightText]).toEqual(PALETTE.chart.slice(0, 4))
    const hc = css.slice(css.search(/@media\s*\(prefers-contrast:\s*more\)/))
    expect(hc).toMatch(new RegExp(`:root\\[data-theme="light"\\]\\{\\s*--acc:${ACCENT.lightPressed}`))
    // what is handed to the phone (notification, widgets) is the same lime
    expect(ACCENTS).toEqual({ lime: ACCENT.dark })
    expect(ACCENT_INK).toEqual({ lime: ACCENT.ink })
  })

  it('the lime is the only hue besides the red, and the design layer writes no colour at all', () => {
    const hues = new Set()
    for (const f of files) {
      if (NOT_OURS.has(rel(f))) continue
      for (const h of findColours(fs.readFileSync(f, 'utf8'), f)) {
        const rgb = parseColour(h.text).rgb
        if (!h.grey && !isChrome(rgb)) hues.add(key(rgb))
      }
    }
    for (const h of hues) expect(SIGNAL.has(h), h).toBe(true)
    expect(hues.has(key(parseColour(ACCENT.dark).rgb))).toBe(true)
    expect(findColours(fs.readFileSync(path.join(SRC, 'design.css'), 'utf8'), 'design.css')).toEqual([])
  })

  it('the three typefaces are served by the app, each with its licence', () => {
    const css = fs.readFileSync(path.join(SRC, 'type.css'), 'utf8')
    const faces = css.match(/@font-face\s*\{[^}]*\}/g) || []
    for (const fam of ['Space Grotesk', 'Manrope', 'JetBrains Mono']) {
      const mine = faces.filter(f => f.includes(`font-family:'${fam}'`))
      expect(mine.length, fam).toBeGreaterThan(1)
      for (const face of mine) {
        const file = face.match(/url\(\.\/(fonts\/[^)]+)\)/)?.[1]
        expect(fs.existsSync(path.join(SRC, file)), file).toBe(true)
        expect(face).toMatch(/unicode-range:/)
      }
    }
    for (const dir of ['space-grotesk', 'manrope', 'jetbrains-mono']) expect(fs.existsSync(path.join(SRC, 'fonts', dir, 'OFL.txt')), dir).toBe(true)
    const main = fs.readFileSync(path.join(SRC, 'main.jsx'), 'utf8')
    // after index.css, so the layer wins at equal specificity
    expect(main.indexOf("import './design.css'")).toBeGreaterThan(main.indexOf("import './index.css'"))
    expect(main).toMatch(/import '\.\/type\.css'/)
  })

  it('pictures that are part of the interface are shown without their colour', () => {
    const css = fs.readFileSync(path.join(SRC, 'index.css'), 'utf8')
    expect(css).toMatch(/\.exmedia img,\.exmedia video,img\.thumb[^{]*\{filter:grayscale\(1\)\}/)
    expect(css).toMatch(/\.gmap\{filter:grayscale\(1\)\}/)
    expect(css).toMatch(/\.youtube-video iframe\{filter:grayscale\(1\)\}/)
    // Your own photos and videos are not the interface.
    expect(css).not.toMatch(/\.(?:pp-img|mviewer|wmedia)[^{}]*\{[^}]*grayscale/)
  })

  it('emoji are drawn by the outline font, and only emoji are', () => {
    const css = fs.readFileSync(path.join(SRC, 'mono-emoji.css'), 'utf8')
    const faces = css.match(/@font-face\s*\{[^}]*\}/g) || []
    expect(faces.length).toBeGreaterThan(5)
    for (const face of faces) {
      expect(face).toMatch(/font-family:\s*'Mono Emoji'/)
      const file = face.match(/url\(['"]?\.\/(fonts\/noto-emoji\/[^'")]+)/)?.[1]
      expect(fs.existsSync(path.join(SRC, file)), file).toBe(true)
      // Digits, # and * are part of keycap emoji in the font. Claimed here, every number in the
      // app would be set in it.
      const starts = [...face.match(/unicode-range:([^;]*)/)[1].matchAll(/U\+([0-9a-f]+)/gi)].map(m => parseInt(m[1], 16))
      for (const cp of starts) expect(cp === 0x200d || cp === 0x20e3 || cp >= 0x2300, 'U+' + cp.toString(16)).toBe(true)
    }
    expect(fs.existsSync(path.join(SRC, 'fonts/noto-emoji/OFL.txt'))).toBe(true)
    expect(fs.readFileSync(path.join(SRC, 'index.css'), 'utf8')).toMatch(/font-family:'Mono Emoji',-apple-system/)
  })
})

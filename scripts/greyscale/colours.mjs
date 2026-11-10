// Finds colour literals in source text and says whether each is a neutral grey. Shared by
// desaturate.mjs (rewrites them) and frontend/src/greyscale.test.js (fails on them).
//
// A grey is r = g = b, give or take TOLERANCE on the 0-255 scale: upstream's shadows and scrims
// are exact (#000, rgba(0,0,0,.5)) and so is everything this fork writes.
export const TOLERANCE = 0

const NAMED = {
  red: [255, 0, 0], green: [0, 128, 0], blue: [0, 0, 255], yellow: [255, 255, 0], orange: [255, 165, 0],
  purple: [128, 0, 128], pink: [255, 192, 203], gold: [255, 215, 0], lime: [0, 255, 0], cyan: [0, 255, 255],
  magenta: [255, 0, 255], crimson: [220, 20, 60], tomato: [255, 99, 71], teal: [0, 128, 128], navy: [0, 0, 128],
}

const lin = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4 }
const unlin = y => Math.round(255 * (y <= 0.0031308 ? y * 12.92 : 1.055 * y ** (1 / 2.4) - 0.055))
/** The grey (0-255) with the same WCAG relative luminance as r, g, b. */
export const luminanceGrey = ([r, g, b]) => unlin(0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b))
export const isGrey = ([r, g, b]) => Math.max(r, g, b) - Math.min(r, g, b) <= TOLERANCE

const hex2 = v => Math.round(v).toString(16).padStart(2, '0')

function hslToRgb(h, s, l) {
  h = ((h % 360) + 360) % 360
  const c = (1 - Math.abs(2 * l - 1)) * s, x = c * (1 - Math.abs(((h / 60) % 2) - 1)), m = l - c / 2
  const [r, g, b] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x]
  return [r, g, b].map(v => (v + m) * 255)
}

const num = (t, scale = 255) => t.endsWith('%') ? parseFloat(t) / 100 * scale : parseFloat(t)

/** { rgb, alpha (the source text of the alpha, or null), kind } for one literal, or null. */
export function parseColour(text) {
  let m
  if ((m = /^#([0-9a-f]{3,8})$/i.exec(text))) {
    const h = m[1]
    if (h.length === 3 || h.length === 4) return { kind: 'hex', rgb: [...h.slice(0, 3)].map(c => parseInt(c + c, 16)), alpha: h[3] ? h[3] + h[3] : null, short: true }
    if (h.length === 6 || h.length === 8) return { kind: 'hex', rgb: [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16)), alpha: h.slice(6) || null }
    return null
  }
  if ((m = /^(rgba?|hsla?)\(\s*([^)]*)\)$/i.exec(text))) {
    const parts = m[2].split(/[\s,/]+/).filter(Boolean)
    if (parts.length < 3 || parts.slice(0, 3).some(p => !/^-?[\d.]+(%|deg)?$/.test(p))) return null
    const alpha = parts[3] ?? null
    const rgb = m[1].toLowerCase().startsWith('rgb')
      ? parts.slice(0, 3).map(p => num(p))
      : hslToRgb(parseFloat(parts[0]), num(parts[1], 1) > 1 ? num(parts[1], 1) / 100 : num(parts[1], 1), num(parts[2], 1) > 1 ? num(parts[2], 1) / 100 : num(parts[2], 1))
    return { kind: 'fn', rgb, alpha }
  }
  if (Object.hasOwn(NAMED, text.toLowerCase())) return { kind: 'named', rgb: NAMED[text.toLowerCase()], alpha: null }
  return null
}

/** The replacement text for a hit: the same notation, the same alpha, no hue. */
export function greyOf(hit) {
  const g = luminanceGrey(hit.rgb)
  if (hit.kind === 'fn') return hit.alpha == null ? `rgb(${g},${g},${g})` : `rgba(${g},${g},${g},${hit.alpha})`
  return '#' + hex2(g).repeat(3) + (hit.kind === 'hex' && hit.alpha ? hit.alpha : '')
}

// Comments blanked to spaces of the same length, so indexes and line numbers survive.
const blank = s => s.replace(/[^\n]/g, ' ')
function stripComments(src, isCss) {
  let out = src.replace(/\/\*[\s\S]*?\*\//g, blank)
  if (!isCss) {
    out = out.replace(/\{\/\*[\s\S]*?\*\/\}/g, blank)
    // a // comment: at the start of a line or after whitespace, and never the // of a URL
    out = out.replace(/(^|[\s;,{}()])\/\/[^\n]*/g, (m, lead) => lead + blank(m.slice(lead.length)))
    out = out.replace(/<!--[\s\S]*?-->/g, blank)
  }
  return out
}

/**
 * Every colour literal in `src`: { index, line, text, rgb, alpha, kind, grey }. `file` picks the
 * rules: CSS takes any hex, script and markup only a hex that sits where a value does (after a
 * quote, a colon, an equals sign, a comma, an opening bracket or whitespace inside a string).
 */
export function findColours(src, file = '') {
  const isCss = /\.css$/.test(file)
  const text = stripComments(src, isCss)
  const hits = []
  const lineOf = i => text.slice(0, i).split('\n').length
  const push = (index, raw) => {
    const c = parseColour(raw)
    if (c) hits.push({ index, line: lineOf(index), text: raw, ...c, grey: isGrey(c.rgb.map(Math.round)) })
  }
  const hexRe = isCss
    ? /#[0-9a-f]{3,8}\b/gi
    : /(?<=['"`:=,(\s])#(?:[0-9a-f]{8}|[0-9a-f]{6}|[0-9a-f]{3,4})(?=['"`;,)\s<])/gi
  for (const m of text.matchAll(hexRe)) {
    // In script, a short hex has to be closed by a quote or a semicolon: "(#454)" is an issue.
    if (!isCss && m[0].length <= 5 && !/['"`;]/.test(text[m.index + m[0].length] || '')) continue
    // In CSS, "#" also opens an id selector: a hex is only a value after its declaration's colon.
    if (isCss) {
      const before = text.slice(Math.max(text.lastIndexOf('{', m.index), text.lastIndexOf(';', m.index), text.lastIndexOf('}', m.index)) + 1, m.index)
      if (!before.includes(':')) continue
    }
    push(m.index, m[0])
  }
  for (const m of text.matchAll(/\b(?:rgba?|hsla?)\(\s*-?[\d.]+[^)]*\)/gi)) push(m.index, m[0])
  return hits.sort((a, b) => a.index - b.index)
}

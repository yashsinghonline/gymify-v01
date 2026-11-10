#!/usr/bin/env node
// Turns every colour literal in the given files into the neutral grey of the same luminance.
//
//   node scripts/greyscale/desaturate.mjs frontend/src/seasonal/christmas.css ...   rewrite in place
//   node scripts/greyscale/desaturate.mjs --check frontend/src/index.css ...         list, change nothing
//
// The greyscale fork's helper for a merge from upstream: new upstream CSS arrives with its colours,
// frontend/src/greyscale.test.js names the files and lines, and this rewrites them to a first
// draft (the lightness is kept, so the contrast the upstream author checked still holds). Colours
// that carry meaning then deserve a look by hand; the ink ramp in index.css is where they belong.
//
// Comments are left alone (an issue number like #454 is not a colour). In .js/.jsx/.html/.json a
// hex is only taken inside a string or an attribute, never bare.
import fs from 'node:fs'
import { greyOf, findColours } from './colours.mjs'

const args = process.argv.slice(2)
const check = args.includes('--check')
const files = args.filter(a => !a.startsWith('--'))
if (!files.length) { console.error('usage: desaturate.mjs [--check] <file>...'); process.exit(2) }

let total = 0
for (const file of files) {
  const src = fs.readFileSync(file, 'utf8')
  const hits = findColours(src, file).filter(h => !h.grey)
  if (!hits.length) continue
  total += hits.length
  if (check) { for (const h of hits) console.log(`${file}:${h.line}: ${h.text}`); continue }
  let out = '', at = 0
  for (const h of hits) { out += src.slice(at, h.index) + greyOf(h); at = h.index + h.text.length }
  fs.writeFileSync(file, out + src.slice(at))
  console.log(`${file}: ${hits.length} colour${hits.length === 1 ? '' : 's'} -> grey`)
}
if (check && total) process.exit(1)

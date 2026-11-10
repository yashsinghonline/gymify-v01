import { describe, expect, it } from 'vitest'
import { MODULES, GROUPS, PRESETS } from './modules.js'
import { moduleCopy, groupCopy, presetCopy } from './modules-copy.js'
import { brandText } from './brand.js'

// modules.js keeps upstream's English; t() puts this fork's name in it (lib/brand.js).
const named = s => brandText(s, s)

describe('modules-copy', () => {
  it('says in t() exactly the English modules.js keeps (the search matches on it)', () => {
    const m = moduleCopy(), g = groupCopy(), p = presetCopy()
    for (const x of MODULES) expect(m[x.id]).toEqual([x.title, named(x.desc)])
    for (const x of GROUPS) expect(g[x.id]).toBe(x.title)
    for (const x of PRESETS) expect(p[x.id]).toEqual([x.title, x.desc])
    expect(Object.keys(m)).toHaveLength(MODULES.length)
  })
})

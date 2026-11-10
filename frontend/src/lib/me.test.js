import { describe, expect, it } from 'vitest'
import { GOALS, LEVELS, SEXES, ageOf, cleanMe, cmFromFtIn, formFrom, ftInFromCm, profileLine, readForm, saveProfile, unitIsSet } from './me.js'

// Who is training (lib/me.js): asked once on first open, kept in the profile on the device.
const NOW = new Date(2026, 10, 10, 9, 30).getTime()
const filled = { name: ' Aarav ', age: '27', sex: 'male', unit: 'kg', cm: '176', ft: '', inch: '', weight: '72,5', goal: 'muscle', level: 'new', days: 4 }
const fresh = () => ({ unit: 'kg', body: 'male', me: null, bodyweight: [], workouts: [], routines: [] })

describe('reading the form', () => {
  it('takes a filled form: trimmed name, a birth year instead of an age, a decimal comma', () => {
    const r = readForm(filled, NOW)
    expect(r.ok).toBe(true)
    expect(r.errors).toEqual({})
    expect(r.value).toEqual({
      me: { name: 'Aarav', born: 1999, sex: 'male', height: 176, goal: 'muscle', level: 'new', days: 4, at: NOW },
      unit: 'kg', weight: 72.5,
    })
  })

  it('asks for every answer, and says which are missing', () => {
    const r = readForm(formFrom(fresh(), NOW), NOW)
    expect(r.ok).toBe(false)
    expect(r.value).toBe(null)
    // days comes with a suggestion; everything else is the user's to say
    expect(Object.keys(r.errors).sort()).toEqual(['age', 'goal', 'height', 'level', 'name', 'sex', 'weight'])
  })

  it.each([
    ['age', '9'], ['age', '101'], ['age', '27.5'], ['age', 'abc'],
    ['cm', '50'], ['cm', '300'], ['weight', '10'], ['weight', '400'], ['weight', ''],
    ['name', '   '], ['sex', 'robot'], ['goal', 'fly'], ['level', 'god'], ['days', 0], ['days', 8],
  ])('refuses %s = %j', (k, v) => {
    const r = readForm({ ...filled, [k]: v }, NOW)
    expect(r.ok).toBe(false)
    expect(Object.keys(r.errors)).toEqual([k === 'cm' ? 'height' : k])
  })

  it('reads feet, inches and pounds, and keeps the height in centimetres', () => {
    const r = readForm({ ...filled, unit: 'lb', cm: '', ft: '5', inch: '10', weight: '160' }, NOW)
    expect(r.ok).toBe(true)
    expect(r.value.me.height).toBe(178)
    expect(r.value.unit).toBe('lb')
    expect(r.value.weight).toBe(160)
    // the limits are in kilograms whatever was typed: 40 lb is 18 kg, under the floor
    expect(readForm({ ...filled, unit: 'lb', ft: '5', inch: '10', weight: '40' }, NOW).errors).toEqual({ weight: true })
    expect(cmFromFtIn(6, 0)).toBe(183)
    expect(ftInFromCm(183)).toEqual({ ft: 6, in: 0 })
    expect(ftInFromCm(178)).toEqual({ ft: 5, in: 10 })
  })
})

describe('saving', () => {
  it('writes the profile, the unit, the figure and a first weigh-in', () => {
    const s = fresh()
    expect(saveProfile(s, readForm({ ...filled, sex: 'female', unit: 'lb', ft: '5', inch: '6', weight: '140' }, NOW).value, NOW)).toBe(true)
    expect(s.me).toEqual({ name: 'Aarav', born: 1999, sex: 'female', height: 168, goal: 'muscle', level: 'new', days: 4, at: NOW })
    expect(s.unit).toBe('lb')
    expect(s.body).toBe('female')
    expect(s.bodyweight).toHaveLength(1)
    expect(s.bodyweight[0]).toMatchObject({ d: '2026-11-10', w: 140 })
  })

  it('"other" leaves the muscle figure as it was', () => {
    const s = { ...fresh(), body: 'female' }
    saveProfile(s, readForm({ ...filled, sex: 'other' }, NOW).value, NOW)
    expect(s.me.sex).toBe('other')
    expect(s.body).toBe('female')
  })

  it('saved again unchanged, logs no second weigh-in; a new weight does', () => {
    const s = fresh()
    saveProfile(s, readForm(filled, NOW).value, NOW)
    const again = formFrom(s, NOW)
    expect(again).toMatchObject({ name: 'Aarav', age: '27', sex: 'male', cm: '176', weight: '72.5', goal: 'muscle', level: 'new', days: 4 })
    saveProfile(s, readForm({ ...again, name: 'Aarav K' }, NOW + 1000).value, NOW + 1000)
    expect(s.me.name).toBe('Aarav K')
    expect(s.bodyweight).toHaveLength(1)
    saveProfile(s, readForm({ ...again, weight: '73' }, NOW + 86400000).value, NOW + 86400000)
    expect(s.bodyweight.map(b => b.w)).toEqual([72.5, 73])
  })

  it('does not switch the unit under numbers that are already logged', () => {
    const s = { ...fresh(), unit: 'lb', bodyweight: [{ d: '2026-11-01', w: 160, t: 1 }] }
    expect(unitIsSet(s)).toBe(true)
    expect(unitIsSet(fresh())).toBe(false)
    saveProfile(s, readForm({ ...filled, weight: '160' }, NOW).value, NOW)
    expect(s.unit).toBe('lb')
    expect(s.bodyweight).toHaveLength(1)
  })

  it('writes nothing for a form that did not read', () => {
    const s = fresh()
    expect(saveProfile(s, readForm({ ...filled, name: '' }, NOW).value, NOW)).toBe(false)
    expect(s.me).toBe(null)
    expect(s.bodyweight).toEqual([])
  })
})

describe('what is stored', () => {
  it('is cleaned on the way back in: an edited backup cannot plant anything else', () => {
    expect(cleanMe(null)).toBe(null)
    expect(cleanMe({ name: '  ' })).toBe(null)
    expect(cleanMe({ name: 'x'.repeat(90), born: 'soon', sex: '<b>', height: 9999, goal: {}, level: 7, days: 99, at: 'x', extra: 'kept?' }))
      .toEqual({ name: 'x'.repeat(40), born: null, sex: null, height: null, goal: null, level: null, days: null, at: 0 })
  })

  it('the age moves with the calendar', () => {
    const me = { name: 'A', born: 1999 }
    expect(ageOf(me, NOW)).toBe(27)
    expect(ageOf(me, new Date(2030, 0, 1).getTime())).toBe(31)
    expect(ageOf(null)).toBe(null)
  })

  it('reads as one line for a settings row', () => {
    const me = cleanMe({ name: 'A', born: 1999, height: 176, goal: 'muscle' })
    expect(profileLine(me, x => x, NOW)).toBe('27 · 176 cm · Build muscle')
    expect(profileLine(me, () => 'Muskeln aufbauen', NOW)).toBe('27 · 176 cm · Muskeln aufbauen')
    expect(profileLine(null)).toBe('')
  })

  it('offers each choice once', () => {
    for (const list of [SEXES, GOALS, LEVELS]) expect(new Set(list.map(o => o[0])).size).toBe(list.length)
  })
})

describe('nothing leaves the device', () => {
  it('the module and the screen make no request of any kind', async () => {
    const fs = await import('node:fs')
    const path = await import('node:path')
    for (const f of ['lib/me.js', 'views/Welcome.jsx']) {
      const src = fs.readFileSync(path.resolve(process.cwd(), 'src', f), 'utf8').replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '')
      expect(src, f).not.toMatch(/\bfetch\s*\(|XMLHttpRequest|sendBeacon|WebSocket|EventSource|\bapi\s*\(|https?:\/\//)
    }
  })
})

describe('the app starts empty', () => {
  it('no shipped module imports test data or the old example profile', async () => {
    const fs = await import('node:fs')
    const path = await import('node:path')
    const root = path.resolve(process.cwd(), 'src')
    const shipped = fs.readdirSync(root, { recursive: true }).map(String)
      .filter(f => /\.(js|jsx)$/.test(f) && !/\.test\.|\.test-util\./.test(f) && !f.startsWith('locales'))
    expect(shipped.length).toBeGreaterThan(200)
    const bad = shipped.filter(f => /test-util|demoSeed|coach-demo/.test(fs.readFileSync(path.join(root, f), 'utf8').replace(/\/\/.*$/gm, '')))
    expect(bad).toEqual([])
  })
})

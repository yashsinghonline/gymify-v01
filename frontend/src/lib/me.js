// Who is training: the handful of things the app asks once, on first open, and keeps in the
// profile (S.me) next to everything else. Nothing here leaves the device: there is no request in
// this file and none is made with what it returns. It is saved, exported in a backup and wiped by
// "Reset everything" exactly like workouts are.
//
//   S.me = { name, born, sex, height, goal, level, days, at }
//     born    birth year, not an age: an age is wrong a year later
//     height  centimetres, whatever unit it was typed in
//     at      when it was last saved (ms)
//
// Three answers already have a home in the profile and go there instead of being kept twice:
// the unit (S.unit), the figure on the muscle maps (S.body) and the weight (a weigh-in).
import { logWeighIn } from './bodyweight.js'

// [value, English label]. The labels are translation keys, so they go through t() where shown.
export const SEXES = [['male', 'Male'], ['female', 'Female'], ['other', 'Other']]
export const GOALS = [['fat', 'Lose fat'], ['muscle', 'Build muscle'], ['strength', 'Get stronger'], ['fit', 'General fitness']]
// "Experienced", not "Advanced": that word is already a key in the language packs, where it means
// advanced settings, and half of them translate it in a way no lifter would be called.
export const LEVELS = [['new', 'Beginner'], ['mid', 'Intermediate'], ['pro', 'Experienced']]

export const AGE = [10, 100]
export const HEIGHT_CM = [90, 250]
export const WEIGHT_KG = [25, 350]
export const NAME_MAX = 40

const LB = 0.45359237
const IN = 2.54
const num = v => {
  const n = typeof v === 'number' ? v : parseFloat(String(v ?? '').replace(',', '.'))
  return Number.isFinite(n) ? n : null
}
const within = (n, [lo, hi]) => n != null && n >= lo && n <= hi
const one = (list, v) => (list.some(([k]) => k === v) ? v : null)

export const cmFromFtIn = (ft, inch) => Math.round(((num(ft) || 0) * 12 + (num(inch) || 0)) * IN)
export const ftInFromCm = cm => {
  const total = Math.round((num(cm) || 0) / IN)
  return { ft: Math.floor(total / 12), in: total % 12 }
}
export const ageOf = (me, now = Date.now()) => (me && me.born ? new Date(now).getFullYear() - me.born : null)

/** One line about the profile for a settings row: "28 · 178 cm · Build muscle". `tr` translates. */
export function profileLine(me, tr = x => x, now = Date.now()) {
  if (!me) return ''
  const goal = GOALS.find(g => g[0] === me.goal)
  return [ageOf(me, now), me.height ? me.height + ' cm' : null, goal ? tr(goal[1]) : null].filter(Boolean).join(' · ')
}

/** What a stored S.me is trusted to hold: anything else (an edited backup, an older shape) is dropped. */
export function cleanMe(raw) {
  if (!raw || typeof raw !== 'object') return null
  const name = typeof raw.name === 'string' ? raw.name.trim().slice(0, NAME_MAX) : ''
  if (!name) return null
  const born = num(raw.born), height = num(raw.height), days = num(raw.days)
  return {
    name,
    born: born != null && born > 1900 && born < 2200 ? Math.round(born) : null,
    sex: one(SEXES, raw.sex),
    height: within(height, HEIGHT_CM) ? Math.round(height) : null,
    goal: one(GOALS, raw.goal),
    level: one(LEVELS, raw.level),
    days: days != null && days >= 1 && days <= 7 ? Math.round(days) : null,
    at: num(raw.at) || 0,
  }
}

/** The form's fields, as text, for a profile that may already hold answers. */
export function formFrom(s, now = Date.now()) {
  const me = cleanMe(s && s.me) || {}
  const lb = !!s && s.unit === 'lb'
  const fi = me.height ? ftInFromCm(me.height) : null
  const last = s && Array.isArray(s.bodyweight) && s.bodyweight.length ? s.bodyweight[s.bodyweight.length - 1].w : null
  return {
    name: me.name || '',
    age: me.born ? String(ageOf(me, now)) : '',
    sex: me.sex || null,
    unit: lb ? 'lb' : 'kg',
    cm: me.height ? String(me.height) : '',
    ft: fi ? String(fi.ft) : '',
    inch: fi ? String(fi.in) : '',
    weight: last ? String(last) : '',
    goal: me.goal || null,
    level: me.level || null,
    days: me.days || 3,
  }
}

/**
 * Reads the form. → { ok, errors: { field: true }, value } where value is what save() takes.
 * Every question is asked for: the screen is the one moment the app gets to know its user.
 */
export function readForm(f, now = Date.now()) {
  const errors = {}
  const name = String(f.name || '').trim().slice(0, NAME_MAX)
  if (!name) errors.name = true
  const age = num(f.age)
  if (!within(age, AGE) || age !== Math.round(age)) errors.age = true
  if (!one(SEXES, f.sex)) errors.sex = true
  const lb = f.unit === 'lb'
  const height = lb ? cmFromFtIn(f.ft, f.inch) : Math.round(num(f.cm) || 0)
  if (!within(height, HEIGHT_CM)) errors.height = true
  const weight = num(f.weight)
  if (!within(weight == null ? null : (lb ? weight * LB : weight), WEIGHT_KG)) errors.weight = true
  if (!one(GOALS, f.goal)) errors.goal = true
  if (!one(LEVELS, f.level)) errors.level = true
  const days = num(f.days)
  if (!(days >= 1 && days <= 7)) errors.days = true
  const ok = !Object.keys(errors).length
  return {
    ok, errors,
    value: ok ? {
      me: { name, born: new Date(now).getFullYear() - age, sex: f.sex, height, goal: f.goal, level: f.level, days: Math.round(days), at: now },
      unit: lb ? 'lb' : 'kg',
      weight: Math.round(weight * 10) / 10,
    } : null,
  }
}

/** Numbers are already logged in a unit: the form then follows it instead of offering a choice
 *  (changing unit converts what is logged, which is Settings → Units' job, not this form's). */
export const unitIsSet = s => !!s && ['workouts', 'bodyweight', 'routines'].some(k => Array.isArray(s[k]) && s[k].length > 0)

/**
 * Writes a read form into the profile (inside store.update). The weight becomes a weigh-in only
 * when it is news: saving the form again with the number it was opened with logs nothing.
 */
export function saveProfile(s, value, now = Date.now()) {
  if (!value || !value.me) return false
  if (!unitIsSet(s)) s.unit = value.unit
  s.me = cleanMe(value.me)
  if (value.me.sex === 'male' || value.me.sex === 'female') s.body = value.me.sex
  const list = Array.isArray(s.bodyweight) ? s.bodyweight : (s.bodyweight = [])
  const last = list.length ? list[list.length - 1].w : null
  if (value.weight > 0 && (last == null || Math.abs(last - value.weight) >= 0.05)) logWeighIn(s, value.weight, now)
  return true
}

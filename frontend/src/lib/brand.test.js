// The fork's name. The source keeps upstream's "openGym" in every string and the name is swapped
// on the way out of t() (brand.js says why). What that must and must not touch is kept here.
import { describe, it, expect, afterEach } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { APP_NAME, UPSTREAM_NAME, WORDMARK, SITE, brandText } from './brand.js'
import { t, tn, _setLangState } from './i18n-core.js'

const FRONTEND = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const read = f => fs.readFileSync(path.join(FRONTEND, f), 'utf8')

afterEach(() => _setLangState('en', {}, null, null))

describe('the name', () => {
  it('is Gymify, and the wordmark spells it', () => {
    expect(APP_NAME).toBe('Gymify')
    expect(WORDMARK.join('')).toBe(APP_NAME)
    expect(UPSTREAM_NAME).toBe('openGym')
  })

  it('replaces upstream’s in a translated string, in English and in a language pack', () => {
    expect(t('Reload openGym')).toBe('Reload Gymify')
    expect(t('Your {0} in openGym', '2026')).toBe('Your 2026 in Gymify')
    _setLangState('de', { 'Reload openGym': 'openGym neu laden', '{0} sets': { one: '{0} Satz in openGym', other: '{0} Sätze in openGym' } }, null, null)
    expect(t('Reload openGym')).toBe('Gymify neu laden')
    expect(tn('{0} set', '{0} sets', 2)).toBe('2 Sätze in Gymify')
  })

  it('leaves what you typed alone: the name goes in before the arguments do', () => {
    expect(t('A link to “{0}”. Your friend taps it and adds it to their own openGym. The routine rides inside the link, no server in between.', 'openGym push day'))
      .toBe('A link to “openGym push day”. Your friend taps it and adds it to their own Gymify. The routine rides inside the link, no server in between.')
  })

  it('leaves the strings about upstream’s own project: its donation links and store pages', () => {
    for (const s of ['Support openGym', 'Rate openGym on the App Store', 'Rate openGym on Google Play',
      'openGym is free: no ads, no subscriptions, no tracking. A coffee keeps it that way.']) expect(t(s)).toBe(s)
    // ...in a language pack too: the key decides, not the wording
    _setLangState('de', { 'Support openGym': 'openGym unterstützen' }, null, null)
    expect(t('Support openGym')).toBe('openGym unterstützen')
  })

  it('takes the article and the elision along: openGym starts with a vowel, Gymify does not', () => {
    expect(t('That file isn’t an openGym backup.')).toBe('That file isn’t a Gymify backup.')
    _setLangState('fr', {
      'k1': 'Règle l’utilisation de la batterie d’openGym sur Non restreinte.',
      'k2': 'Ce qu’openGym a déjà écrit peut rester.',
    }, null, null)
    expect(t('k1')).toBe('Règle l’utilisation de la batterie de Gymify sur Non restreinte.')
    expect(t('k2')).toBe('Ce que Gymify a déjà écrit peut rester.')
    // "an" is a preposition in German: only English text has its article changed
    _setLangState('de', { 'k3': 'Sende es an openGym.' }, null, null)
    expect(t('k3')).toBe('Sende es an Gymify.')
  })

  it('leaves the phone’s backup folder, which the native code names', () => {
    expect(brandText('k', 'openGym can no longer write to the chosen folder, so copies go to Documents/openGym again.'))
      .toBe('Gymify can no longer write to the chosen folder, so copies go to Documents/openGym again.')
  })

  it('passes anything else through untouched', () => {
    expect(brandText('k', 'Start workout')).toBe('Start workout')
    expect(brandText('k', undefined)).toBe(undefined)
    expect(brandText('k', { one: 'x' })).toEqual({ one: 'x' })
    // lower case is an address or a file name, not the name
    expect(brandText('k', 'Download the APK from opengym.ch')).toBe('Download the APK from opengym.ch')
  })

  it('is on the page shell, the manifest and the worker, which cannot import it', () => {
    const html = read('index.html')
    expect(html).toContain(`<title>${APP_NAME}</title>`)
    expect(html).toContain(`<meta name="apple-mobile-web-app-title" content="${APP_NAME}">`)
    expect(html).not.toMatch(/openGym (could not start|is taking too long)/)
    const manifest = JSON.parse(read('public/manifest.json'))
    expect(manifest.name).toBe(APP_NAME)
    expect(manifest.short_name).toBe(APP_NAME)
    expect(read('public/sw.js')).toContain(`data.title || '${APP_NAME}'`)
  })

  it('still says whose work it is: the About page names openGym and the licence notices stay', () => {
    const settings = read('src/views/Settings.jsx')
    expect(settings).toContain('Based on openGym, © 2026 Duarte Santos. Modified November 2026.')
    expect(read('../LICENSE')).toContain('GNU AFFERO GENERAL PUBLIC LICENSE')
    expect(read('../NOTICE.md')).toContain('gymvisual.com')
    expect(settings).toContain('Media licensed for use in openGym only')
    expect(read('src/lib/print-pictures.js')).toContain('Media licensed for use in openGym only.')
  })

  it('prints no site of its own on cards and paper until one is set', () => {
    expect(SITE).toBe('')
  })

  it('uses no lookbehind, which Safari before 16.4 cannot parse', () => {
    expect(read('src/lib/brand.js').replace(/\/\/.*$/gm, '')).not.toMatch(/\(\?<[!=]/)
  })
})

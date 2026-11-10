// What this fork calls itself, and its colours. See DESIGN.md and README.md.
//
// The app is upstream's openGym with another name on it. Renaming every string would touch a few
// hundred lines in twenty languages and collide with each merge from upstream, so the source keeps
// saying "openGym" and the name is swapped in one place, on the way out: `t()` (i18n-core.js) runs
// every translated string through `brandText`. The few places that write the name without `t()`
// (the page title, the wordmark on a share card, the print header) import APP_NAME from here.
//
// No imports: i18n-core.js is loaded by everything, the service worker's tests included.

export const APP_NAME = 'Gymify'
export const UPSTREAM_NAME = 'openGym'

/**
 * The wordmark in two parts, the second drawn in the accent (share cards). Upstream: open + Gym.
 */
export const WORDMARK = ['Gym', 'ify']

/**
 * A site printed on share cards and in the footer of printed pages. Upstream prints opengym.ch;
 * this fork has no site of its own, and pointing at upstream's would say the card came from there.
 * Set it to your own address, without https://, and it is drawn again.
 */
export const SITE = ''

/**
 * The palette (DESIGN.md, Colors). A dark, single-accent system: one stack of cool near-blacks for
 * the chrome, two text tones, and one lime. These are the only places the lime ramp and the red
 * are written down: here, and the tokens in index.css, which a test keeps equal to these
 * (src/palette.test.js). The light theme is not in the design; it is derived from the same colours
 * (the page's ink on the design's lightest tone) so the theme switch keeps working.
 */
export const PALETTE = {
  dark: {
    bg: '#0f1115',        // surface: the page
    surface: '#181b21',   // surface-alt: every card and list row
    border: '#22262e',    // the hairline round a card; also the nested, pressed step
    muted: '#2a2f38',     // surface-muted: wells, secondary buttons, tracks
    ink: '#f0f2f5',       // on-surface
    ink2: '#9ca3af',      // on-surface-variant
    error: '#ff3b30',     // a reading that fell short, an action that destroys
  },
  light: {
    bg: '#f0f2f5', surface: '#ffffff', border: '#dadcdf', muted: '#e7e9ec', ink: '#0f1115', ink2: '#5c5d60',
    error: '#c33129',     // the design's red is 3.2:1 on this page; with a quarter of the ink in it, 4.9:1
  },
  // chart-1 to chart-5: the lime ramp, for data only
  chart: ['#ccff00', '#a3cc00', '#7a9900', '#526600', '#293300'],
}

/**
 * The accent: the design's lime, the one hue of the interface. On the dark theme it is the lime
 * itself. On white the lime is 1.1:1 and cannot be seen, so the light theme takes darker steps of
 * the same ramp: chart-2 for a fill, chart-4 for words (6.4:1).
 */
export const ACCENT = {
  dark: '#ccff00',        // --acc on the dark theme; also what lives outside the page (notification, widgets)
  light: '#a3cc00',       // --acc on the light theme
  pressed: '#a3cc00',     // --acc-2 on the dark theme
  lightPressed: '#7a9900',    // --acc-2 on the light theme; also its fill under Increase Contrast
  lightText: '#526600',   // --acc-ink on the light theme
  ink: '#0a0a0a',         // on-primary: what is written on the accent
}

// Strings that are about upstream's project itself, not about the app in your hand: the donation
// links go to openGym's author and the store pages are openGym's. Renamed, they would mislead.
const ABOUT_UPSTREAM = new Set([
  'Support openGym',
  'openGym is free: no ads, no subscriptions, no tracking. A coffee keeps it that way.',
  'Rate openGym on the App Store',
  'Rate openGym on Google Play',
])

// The phone apps' backup folder is named in the native code (BackupFolderPlugin.java), which this
// fork does not touch, so the folder keeps its name and so does every sentence that names it.
const FOLDER = 'Documents/' + UPSTREAM_NAME

// "openGym" starts with a vowel and "Gymify" does not, so what leans on the name changes with
// it: English "an openGym server", French "d’openGym" and "qu’openGym" (the only two elisions the
// packs use). The English article is only touched in English text, which is where the string is
// its own key: "an" is a word of its own in German.
const ELISIONS = [['d’', 'de '], ['d\'', 'de '], ['qu’', 'que '], ['qu\'', 'que '], ['D’', 'De '], ['Qu’', 'Que ']]
const rename = (part, english) => {
  if (english) part = part.replaceAll('an ' + UPSTREAM_NAME, 'a ' + APP_NAME).replaceAll('An ' + UPSTREAM_NAME, 'A ' + APP_NAME)
  else for (const [from, to] of ELISIONS) part = part.replaceAll(from + UPSTREAM_NAME, to + APP_NAME)
  return part.replaceAll(UPSTREAM_NAME, APP_NAME)
}

/**
 * A translated string with the app's name in place of upstream's. `key` is the English source
 * string (the translation key), `text` what the language pack made of it.
 * No lookbehind in here: Safari before 16.4 fails to parse one, and then nothing starts.
 */
export function brandText(key, text) {
  if (typeof text !== 'string' || !text.includes(UPSTREAM_NAME) || ABOUT_UPSTREAM.has(key)) return text
  return text.split(FOLDER).map(part => rename(part, text === key)).join(FOLDER)
}

// Where the source of THIS copy can be had (AGPL section 13: whoever uses a hosted copy is
// entitled to its source, changes included). Set VITE_SOURCE_URL when building, to the address
// of your own repository. Empty leaves the About line without a link, which is only right for
// a copy nobody else uses.
// Only a web address is taken: it ends up as a link's href.
const sourceUrl = String((typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_SOURCE_URL) || '').trim()
export const SOURCE_URL = /^https?:\/\/\S+$/.test(sourceUrl) ? sourceUrl : ''

// The address this copy is running at, for the links it hands out (a shared routine). A copy
// points at itself, wherever it is hosted, never at somebody else's site.
// A build that does not run at its public address (the Android or iOS shell runs at localhost)
// says where it is published with VITE_APP_URL.
const appUrl = String((typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_APP_URL) || '').trim()
export const APP_URL = /^https?:\/\/\S+$/.test(appUrl) ? appUrl.replace(/[#?].*$/, '').replace(/\/*$/, '/') : ''
export const appBase = () => APP_URL || (typeof location !== 'undefined' && /^https?:$/.test(location.protocol) ? location.origin + location.pathname : '')


import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import { MOBILE } from './lib/mobile.js'
import { useStore } from './store/useStore.js'
import { startMediaSync } from './lib/media-sync.js'
import { startNativeKeyboard } from './lib/native-keyboard.js'
// The Coach's and the admin dashboard's styles stay in the main stylesheet, in the place they
// always had (before index.css), although their screens are now loaded on demand (App.jsx).
import './admin.css'
import './coach.css'
import './index.css'
// Greyscale fork: the monochrome emoji font the body's font stack starts with (mono-emoji.css).
import './mono-emoji.css'
// The design (DESIGN.md): its three typefaces, then the layer that restyles upstream's sheet.
import './type.css'
import './design.css'
import { hideBoot, handOverFromLaunchScreen } from './lib/boot.js'
import { guardFocusZoom } from './lib/viewport-zoom.js'

// A canvas does not wait for a web font: a share card drawn before the font is here would get the
// system's colour trophy. So the one glyph the cards draw themselves is fetched now, off to the side.
try { document.fonts?.load("16px 'Mono Emoji'", '\u{1F3C6}')?.catch(() => {}) } catch { /* no FontFaceSet: the page still styles its own emoji */ }

// App.jsx restores per-route scroll itself; the browser's own attempt races it.
// A script that dies before the app draws would otherwise leave the boot logo lifting forever.
window.addEventListener('error', hideBoot, { once: true })
handOverFromLaunchScreen()

if ('scrollRestoration' in history) history.scrollRestoration = 'manual'

// The web build lets people pinch to zoom; on iOS a focused small field must not zoom the page.
if (!MOBILE) guardFocusZoom()

createRoot(document.getElementById('root')).render(
  <StrictMode><App /></StrictMode>
)

// The photos and videos of custom exercises, in every build (the phone and the demo included):
// uploads of what the server lacks, the local clean-up, and the plan's files kept offline.
startMediaSync(useStore)

// Android 15 does not resize the page for the soft keyboard; the app says how much it covers and
// this keeps the focused field above it. Idle everywhere else.
startNativeKeyboard()

// Not in the mobile build: the native shell already serves everything from disk.
if (!MOBILE && 'serviceWorker' in navigator && location.protocol === 'https:') {
  navigator.serviceWorker.register('sw.js').catch(() => {})
  // The plan's exercise media, kept by the worker for a workout opened without a network (#281).
  // It only fetches ahead while the page runs as the installed app; a tab keeps what it has shown.
  import('./lib/media-prefetch.js').then(m => m.startMediaPrefetch(useStore)).catch(() => {})
}

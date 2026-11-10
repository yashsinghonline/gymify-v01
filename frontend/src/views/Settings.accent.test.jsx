// @vitest-environment happy-dom
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import Settings from './Settings.jsx'
import { searchSettings } from './settings-pages.js'
import { setRestAccent } from '../lib/rest-alert.js'

globalThis.IS_REACT_ACT_ENVIRONMENT = true

const mocks = vi.hoisted(() => {
  const state = { S: null }
  state.snapshot = () => ({
    S: state.S,
    user: null,
    update: mut => {
      const next = structuredClone(state.S)
      mut(next)
      state.S = next
    },
    replaceState: vi.fn(), setUser: vi.fn(), pullState: vi.fn(), pushState: vi.fn(),
    signOut: vi.fn(), signOutAll: vi.fn(), resetDemo: vi.fn(), disconnectServer: vi.fn(),
  })
  return state
})
vi.mock('../store/useStore.js', () => {
  const useStore = selector => selector ? selector(mocks.snapshot()) : mocks.snapshot()
  useStore.getState = mocks.snapshot
  return { useStore, DEF: { reminder: { time: '17:30' } }, hasData: () => false }
})
vi.mock('../store/useUI.js', () => {
  const snap = () => ({ toast: vi.fn(), openSheet: vi.fn() })
  const useUI = selector => selector ? selector(snap()) : snap()
  useUI.getState = snap
  return { useUI }
})
vi.mock('react-router-dom', () => ({ useNavigate: () => () => {} }))
vi.mock('../lib/api.js', () => ({
  api: vi.fn(), webauthnOK: () => false, passkeyLogin: vi.fn(), passkeyRegister: vi.fn(), IS_ANDROID: false,
}))
vi.mock('../lib/push.js', () => ({ pushSupported: () => false, enablePush: vi.fn(), disablePush: vi.fn(), sendTestPush: vi.fn() }))
vi.mock('../lib/wakelock.js', () => ({ wakeLockSupported: () => false }))
vi.mock('../lib/mobile.js', () => ({ MOBILE: false, isAndroid: () => Promise.resolve(false), shareExport: vi.fn(), syncReminder: vi.fn() }))
vi.mock('./MobileOnboarding.jsx', () => ({ ConnectSheet: () => null }))
vi.mock('../sheets.jsx', () => ({
  starterPlanSheet: vi.fn(), confirmSheet: vi.fn(), importFromApp: vi.fn(),
  importFromHevy: vi.fn(), equipmentProfileSheet: vi.fn(),
}))

// The Settings view reads the build-time version constant at render time.
globalThis.__APP_VERSION__ ??= 'test'

vi.mock('../lib/rest-alert.js', () => ({ setRestAccent: vi.fn() }))

let host, root
beforeEach(() => {
  mocks.S = { unit: 'kg', theme: 'dark', accent: 'lime', workouts: [], routines: [], exWeights: {} }
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  setRestAccent.mockClear()
})
afterEach(() => {
  act(() => root.unmount())
  host.remove()
})

const mount = () => act(() => root.render(<Settings page="look" />))

// Greyscale fork (DESIGN.md): the accent is the ink, so there is nothing to pick. Upstream's
// tests of the picker (the swatches, the own colour, its notes) went with it; what is left to keep
// true is that it stays gone, and that a profile which carries a colour is left as it came.
describe('Settings: no accent colour to pick', () => {
  it('Look & Home has no swatches and no colour picker', () => {
    mount()
    expect(host.querySelector('input[type="color"]')).toBe(null)
    expect(host.querySelector('.swatch, .swatch-own, .swatches')).toBe(null)
    expect(host.textContent).not.toMatch(/Accent color|Your own color|Pick your own color/)
    // the page itself is there
    expect(host.textContent).toContain('Theme')
  })

  it('a profile that carries a colour from upstream keeps it, untouched', () => {
    mocks.S.accent = 'custom'; mocks.S.accentCustom = '#ff00aa'
    const before = structuredClone(mocks.S)
    mount()
    expect(mocks.S).toEqual(before)
    expect(host.innerHTML).not.toContain('#ff00aa')
    expect(setRestAccent).not.toHaveBeenCalled()
  })

  it('the settings search does not offer it', () => {
    for (const q of ['accent', 'custom color', 'own color', 'picker', 'hex', 'spooky colors', 'festive colors']) {
      expect(searchSettings(q, {}).map(h => h.title), q).not.toContain('Accent color')
      expect(searchSettings(q, {}).map(h => h.title), q).not.toContain('Spooky colors')
      expect(searchSettings(q, {}).map(h => h.title), q).not.toContain('Festive colors')
    }
  })
})

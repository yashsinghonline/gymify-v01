// @vitest-environment happy-dom
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import Settings from './Settings.jsx'

globalThis.IS_REACT_ACT_ENVIRONMENT = true

// The updater downloads an .apk and hands it to the Android package installer, so its row
// may only ever show on the native Android build: never on the web, never on iOS. Each test
// flips the two gates (MOBILE flag, Capacitor platform) and watches whether Settings even
// asks for the latest release. The releases are this copy's own (VITE_RELEASES_REPO): a build
// that names none has no update row at all, and no link to anybody else's download.
const mocks = vi.hoisted(() => {
  const state = { S: null, MOBILE: false, android: false, channel: 'sideload' }
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
  state.checkForUpdate = vi.fn(() => Promise.resolve({ hasUpdate: true, latestVersion: '9.9.9', apkUrl: 'https://x/opengym.apk', hashUrl: null }))
  state.confirmSheet = vi.fn()
  state.forget = vi.fn()
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
// MOBILE is read at render time through a getter so one module mock serves both builds.
vi.mock('../lib/mobile.js', () => ({
  get MOBILE() { return mocks.MOBILE },
  isAndroid: () => Promise.resolve(mocks.android),
  shareExport: vi.fn(), syncReminder: vi.fn(),
}))
vi.mock('../lib/update.js', () => ({
  checkForUpdate: (...a) => mocks.checkForUpdate(...a),
  downloadAndInstall: vi.fn(),
  forgetDownloadedUpdate: (...a) => mocks.forget(...a),
  // Set by VITE_RELEASES_REPO at build time; empty in a build that names no releases of its own.
  get RELEASES_PAGE() { return mocks.releases },
}))
vi.mock('../lib/channel.js', () => ({ getChannel: () => Promise.resolve(mocks.channel), gymReminderBuilt: () => Promise.resolve(true) }))
vi.mock('./MobileOnboarding.jsx', () => ({ ConnectSheet: () => null }))
vi.mock('../sheets.jsx', () => ({
  starterPlanSheet: vi.fn(), confirmSheet: (...a) => mocks.confirmSheet(...a), importFromApp: vi.fn(),
  importFromHevy: vi.fn(), equipmentProfileSheet: vi.fn(), menuSheet: vi.fn(),
}))

globalThis.__APP_VERSION__ ??= 'test'

let host, root
beforeEach(() => {
  mocks.S = {
    unit: 'kg', restSec: 90, restPauseSec: 15, sound: false, effort: 'none',
    gifSize: 'full', workouts: [], routines: [], exWeights: {},
  }
  mocks.MOBILE = false
  mocks.android = false
  mocks.channel = 'sideload'
  mocks.releases = 'https://github.com/me/gymify/releases/latest'
  mocks.checkForUpdate.mockClear()
  mocks.confirmSheet.mockClear()
  mocks.forget.mockClear()
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
})
afterEach(() => {
  act(() => root.unmount())
  host.remove()
})

// The effect resolves two promises (isAndroid, then checkForUpdate) before the row can render.
const mount = async () => {
  await act(async () => { root.render(<Settings page="about" />) })
  await act(async () => { for (let i = 0; i < 4; i++) await Promise.resolve() })
}
const updateRow = () => [...host.querySelectorAll('.lrow')].find(r => r.textContent.includes('Update to Gymify v9.9.9'))
const checkRow = () => [...host.querySelectorAll('.lrow')].find(r => r.textContent.includes('Check for updates'))
const webRow = () => [...host.querySelectorAll('.lrow')].find(r => r.textContent.includes('Get the Android app'))

describe('Settings — in-app update check', () => {
  it('web build: never asks for releases, and points at nobody\'s APK', async () => {
    await mount()
    expect(mocks.checkForUpdate).not.toHaveBeenCalled()
    expect(updateRow()).toBeUndefined()
    expect(checkRow()).toBeUndefined()
    expect(webRow()).toBeUndefined()
  })

  it('Android build that names no releases of its own: no update row', async () => {
    mocks.MOBILE = true
    mocks.android = true
    mocks.releases = ''
    await mount()
    expect(updateRow()).toBeUndefined()
    expect(checkRow()).toBeUndefined()
  })

  it('mobile build on iOS: no check, no row, no section', async () => {
    mocks.MOBILE = true
    await mount()
    expect(mocks.checkForUpdate).not.toHaveBeenCalled()
    expect(updateRow()).toBeUndefined()
    expect(checkRow()).toBeUndefined()
    expect(webRow()).toBeUndefined()
  })

  it('Google Play build: Play installs the updates, so no check and no row', async () => {
    mocks.MOBILE = true
    mocks.android = true
    mocks.channel = 'play'
    await mount()
    expect(mocks.checkForUpdate).not.toHaveBeenCalled()
    expect(updateRow()).toBeUndefined()
    expect(checkRow()).toBeUndefined()
  })

  it('mobile build on Android: checks once and shows the row, tapping it asks before downloading', async () => {
    mocks.MOBILE = true
    mocks.android = true
    await mount()
    expect(mocks.checkForUpdate).toHaveBeenCalledTimes(1)
    expect(updateRow()).toBeTruthy()
    act(() => { updateRow().click() })
    expect(mocks.confirmSheet).toHaveBeenCalledTimes(1)
    expect(mocks.confirmSheet.mock.calls[0][0].title).toBe('Update to 9.9.9?')
  })

  it('Android without a newer release: a "Check for updates" row stays, and tapping it checks again', async () => {
    mocks.MOBILE = true
    mocks.android = true
    mocks.checkForUpdate.mockResolvedValueOnce({ hasUpdate: false, latestVersion: 'test', apkUrl: null, hashUrl: null })
    await mount()
    expect(mocks.checkForUpdate).toHaveBeenCalledTimes(1)
    expect(updateRow()).toBeUndefined()
    expect(checkRow()).toBeTruthy()
    await act(async () => { checkRow().click(); await Promise.resolve() })
    expect(mocks.checkForUpdate).toHaveBeenCalledTimes(2)
    await act(async () => { await Promise.resolve() })
    expect(updateRow()).toBeTruthy()   // the second (default) answer had 9.9.9 — the row now offers it
  })

  it('Android when gitlab.com is unreachable: stays quiet, keeps the row', async () => {
    mocks.MOBILE = true
    mocks.android = true
    mocks.checkForUpdate.mockRejectedValueOnce(new Error('offline'))
    await mount()
    expect(updateRow()).toBeUndefined()
    expect(checkRow()).toBeTruthy()
  })

  it('Android: a downloaded APK left in the cache is deleted once nothing newer is out, and kept while one is', async () => {
    mocks.MOBILE = true
    mocks.android = true
    await mount()
    expect(mocks.forget).not.toHaveBeenCalled()   // 9.9.9 is waiting: its APK may be the one in the cache
    act(() => root.unmount())
    root = createRoot(host)
    mocks.checkForUpdate.mockResolvedValueOnce({ hasUpdate: false, latestVersion: 'test', apkUrl: null, hashUrl: null })
    await mount()
    expect(mocks.forget).toHaveBeenCalledTimes(1)
  })
})

const versionRow = () => [...host.querySelectorAll('.lrow')].find(r => r.textContent.includes('Version'))
describe('Settings → About: which APK this is', () => {
  it('the sideloaded APK names its kind and the animation size built in', async () => {
    mocks.MOBILE = true
    mocks.android = true
    await mount()
    expect(versionRow().textContent).toContain('Standard APK, animations at 180 px')
  })

  it('not on the web, iOS or the Google Play build', async () => {
    await mount()
    expect(versionRow().textContent).not.toContain('APK,')
    for (const [android, channel] of [[false, 'sideload'], [true, 'play']]) {
      act(() => root.unmount())
      root = createRoot(host)
      mocks.MOBILE = true
      mocks.android = android
      mocks.channel = channel
      await mount()
      expect(versionRow().textContent).not.toContain('APK,')
    }
  })
})

// The original project's donation and store-rating links are gone from every build: they led to
// somebody else's accounts and somebody else's store listing.
describe('Settings: no links to anyone else', () => {
  const row = text => [...host.querySelectorAll('.lrow')].find(r => r.textContent.includes(text))
  const none = () => {
    for (const text of ['Buy me a coffee', 'Ko-fi', 'GitHub Sponsors', 'on Google Play']) expect(row(text), text).toBeUndefined()
    expect(host.textContent).not.toContain('A coffee keeps it that way')
    const links = [...host.querySelectorAll('a[href]')].map(a => a.getAttribute('href'))
    expect(links.filter(h => /opengym|DuarteSantos|buymeacoffee|ko-fi|sponsors|play\.google/i.test(h))).toEqual([])
  }
  it('the sideloaded APK', async () => {
    mocks.MOBILE = true
    mocks.android = true
    await mount()
    none()
  })
  it('the Google Play build', async () => {
    mocks.MOBILE = true
    mocks.android = true
    mocks.channel = 'play'
    await mount()
    none()
  })
  it('the web', async () => {
    await mount()
    none()
  })
})

// @vitest-environment happy-dom
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

globalThis.IS_REACT_ACT_ENVIRONMENT = true

// The first-run questions (views/Welcome.jsx): asked before anything else in the device-only
// build, saved into the profile on this device, and sent nowhere. The rules themselves are in
// lib/me.test.js; this is the screen around them, on the real store.
const { useStore, DEF } = await import('../store/useStore.js')
const { useUI } = await import('../store/useUI.js')
const { default: Welcome, ProfileForm } = await import('./Welcome.jsx')

let host, root, toast, fetchSpy
const mount = el => act(() => root.render(el))
const input = label => host.querySelector(`input[aria-label="${label}"]`)
const chip = text => [...host.querySelectorAll('.chip')].find(b => b.textContent.trim() === text)
const go = () => host.querySelector('button[type="submit"]')
const marked = () => [...host.querySelectorAll('.wf-q.bad .wf-l')].map(n => n.textContent)
function type(el, value) {
  const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set
  act(() => { set.call(el, value); el.dispatchEvent(new Event('input', { bubbles: true })) })
}
const click = el => act(() => { el.click() })
const submit = () => act(() => { host.querySelector('form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })) })

beforeEach(() => {
  localStorage.clear()
  useStore.setState({ S: structuredClone(DEF), ready: true })
  toast = vi.fn()
  useUI.setState({ toast })
  fetchSpy = vi.fn(() => Promise.reject(new Error('no network in this test')))
  vi.stubGlobal('fetch', fetchSpy)
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
})
afterEach(() => { act(() => root.unmount()); host.remove(); vi.unstubAllGlobals() })

function fillIn() {
  type(host.querySelector('input[aria-labelledby="wf-name"]'), 'Aarav')
  click(chip('Male'))
  type(input('Age'), '27')
  type(input('Height'), '176')
  type(input('Body weight'), '72.5')
  click(chip('Build muscle'))
  click(chip('Beginner'))
  click(chip('4'))
}

describe('the first-run questions', () => {
  it('a new profile has none of the answers, and no example data to hide them behind', () => {
    expect(DEF.me).toBe(null)
    expect(DEF.workouts).toEqual([])
    expect(DEF.routines).toEqual([])
    expect(DEF.bodyweight).toEqual([])
  })

  it('asks the eight things, and says the answers stay on the device', async () => {
    await mount(<Welcome />)
    expect([...host.querySelectorAll('.wf-l')].map(n => n.textContent))
      .toEqual(['Welcome', 'Your name', 'Sex', 'Units', 'Age', 'Height', 'Body weight', 'Goal', 'Experience', 'Days per week'])
    expect(host.querySelector('h1').textContent).toBe('Gymify')
    expect(host.textContent).toContain('Saved on this device only. Nothing is sent anywhere.')
    expect(go().textContent).toBe('Start training')
    expect(host.textContent).not.toMatch(/openGym|demo/i)
  })

  it('sent empty, it saves nothing and marks what is missing', async () => {
    await mount(<Welcome />)
    submit()
    expect(useStore.getState().S.me).toBe(null)
    expect(toast).toHaveBeenCalledWith('Fill in the marked fields')
    expect(marked()).toEqual(['Your name', 'Sex', 'Age', 'Height', 'Body weight', 'Goal', 'Experience'])
  })

  it('a mark goes away as soon as its answer is given', async () => {
    await mount(<Welcome />)
    submit()
    click(chip('Female'))
    type(input('Age'), '31')
    expect(marked()).toEqual(['Your name', 'Height', 'Body weight', 'Goal', 'Experience'])
  })

  it('filled in, it saves the profile and a first weigh-in on the device, and asks nobody', async () => {
    await mount(<Welcome />)
    fillIn()
    submit()
    const S = useStore.getState().S
    expect(S.me).toMatchObject({ name: 'Aarav', born: new Date().getFullYear() - 27, sex: 'male', height: 176, goal: 'muscle', level: 'new', days: 4 })
    expect(S.unit).toBe('kg')
    expect(S.body).toBe('male')
    expect(S.bodyweight.map(b => b.w)).toEqual([72.5])
    expect(S.workouts).toEqual([])
    expect(toast).not.toHaveBeenCalled()
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('in pounds and feet: the height is asked in two boxes and kept in centimetres', async () => {
    await mount(<Welcome />)
    fillIn()
    // Choosing the unit is not sending the form: a button inside a form submits it unless it
    // says otherwise, and this one once saved the profile in kilograms on the way to pounds.
    const lbft = [...host.querySelectorAll('button')].find(b => b.textContent.trim() === 'lb · ft')
    expect([...host.querySelectorAll('form button')].filter(b => b.type !== 'button').map(b => b.textContent)).toEqual(['Start training'])
    click(lbft)
    expect(useStore.getState().S.me).toBe(null)
    expect(input('Height')).toBe(null)
    type(input('Height (ft)'), '5')
    type(input('Height (in)'), '10')
    type(input('Body weight'), '160')
    submit()
    const S = useStore.getState().S
    expect(S.unit).toBe('lb')
    expect(S.me.height).toBe(178)
    expect(S.bodyweight.map(b => b.w)).toEqual([160])
  })
})

describe('"Your profile" in Settings', () => {
  it('opens with the answers given, and a change is saved without a second weigh-in', async () => {
    await mount(<Welcome />)
    fillIn()
    submit()
    const onSaved = vi.fn()
    await mount(<ProfileForm submit="Save" onSaved={onSaved} />)
    expect(host.querySelector('input[aria-labelledby="wf-name"]').value).toBe('Aarav')
    expect(input('Age').value).toBe('27')
    expect(input('Body weight').value).toBe('72.5')
    expect(chip('Build muscle').getAttribute('aria-pressed')).toBe('true')
    // numbers are logged now, so the unit is no longer on offer here
    expect([...host.querySelectorAll('.wf-l')].map(n => n.textContent)).not.toContain('Units')
    click(chip('Get stronger'))
    click(chip('5'))
    submit()
    const S = useStore.getState().S
    expect(S.me).toMatchObject({ name: 'Aarav', goal: 'strength', days: 5 })
    expect(S.bodyweight).toHaveLength(1)
    expect(onSaved).toHaveBeenCalledTimes(1)
  })
})

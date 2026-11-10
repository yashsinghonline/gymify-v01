// The first screen of a device-only build (lib/demo.js): the app starts empty and asks who is
// training before it shows anything. The answers are saved in the profile on this device
// (lib/me.js) and nowhere else. The same form, opened from Settings, edits them later.
import { useState } from 'react'
import { useStore } from '../store/useStore.js'
import { useUI } from '../store/useUI.js'
import { t } from '../lib/i18n.js'
import { APP_NAME } from '../lib/brand.js'
import Icon from '../components/Icon.jsx'
import { Button, Segmented } from '../components/ui.jsx'
import { GOALS, LEVELS, SEXES, NAME_MAX, formFrom, readForm, saveProfile, unitIsSet } from '../lib/me.js'

const DAYS = [1, 2, 3, 4, 5, 6, 7]

// One question: its kicker, then its control. `bad` marks it once Save was tried without it.
function Q({ id, label, bad, children }) {
  return (
    <div className={'wf-q' + (bad ? ' bad' : '')}>
      <div className="wf-l" id={id}>{label}</div>
      {children}
    </div>
  )
}

// A row of choices, one of them on. Rectangles, not pills (DESIGN.md, Shape).
function Choice({ options, value, onChange, labelledby }) {
  return (
    <div className="wf-chips" role="group" aria-labelledby={labelledby}>
      {options.map(([v, label]) => (
        <button key={v} type="button" className={'chip' + (v === value ? ' on' : '')} aria-pressed={v === value} onClick={() => onChange(v)}>
          {label}
        </button>
      ))}
    </div>
  )
}

function Num({ value, onChange, unit, label, ...rest }) {
  return (
    <label className="wf-num">
      <input className="field" inputMode="decimal" autoComplete="off" value={value} aria-label={label}
        onChange={e => onChange(e.target.value.replace(/[^0-9.,]/g, '').slice(0, 6))} {...rest} />
      {unit && <span className="wf-unit" aria-hidden="true">{unit}</span>}
    </label>
  )
}

/** The questions and the button. `submit` is the button's label; `onSaved` runs after the save. */
export function ProfileForm({ submit, onSaved }) {
  const S = useStore(s => s.S)
  const [f, setF] = useState(() => formFrom(S))
  const [tried, setTried] = useState(false)
  const put = k => v => setF(cur => ({ ...cur, [k]: v }))
  const { errors } = readForm(f)
  const bad = k => tried && !!errors[k]
  const lb = f.unit === 'lb'
  const fixedUnit = unitIsSet(S)

  const save = () => {
    const now = Date.now()
    const read = readForm(f, now)
    if (!read.ok) {
      setTried(true)
      useUI.getState().toast(t('Fill in the marked fields'))
      return
    }
    useStore.getState().update(s => { saveProfile(s, read.value, now) })
    if (onSaved) onSaved(read.value)
  }

  return (
    <form className="wf" noValidate onSubmit={e => { e.preventDefault(); save() }}>
      <Q id="wf-name" label={t('Your name')} bad={bad('name')}>
        <input className="field" value={f.name} maxLength={NAME_MAX} autoComplete="given-name" enterKeyHint="next"
          aria-labelledby="wf-name" aria-invalid={bad('name') || undefined} onChange={e => put('name')(e.target.value)} />
      </Q>

      <Q id="wf-sex" label={t('Sex')} bad={bad('sex')}>
        <Choice labelledby="wf-sex" options={SEXES.map(([v, l]) => [v, t(l)])} value={f.sex} onChange={put('sex')} />
      </Q>

      {!fixedUnit && <Q id="wf-unit" label={t('Units')}>
        <Segmented ariaLabelledby="wf-unit" value={f.unit} onChange={put('unit')}
          options={[{ value: 'kg', label: 'kg · cm' }, { value: 'lb', label: 'lb · ft' }]} />
      </Q>}

      <div className="wf-row">
        <Q id="wf-age" label={t('Age')} bad={bad('age')}>
          <Num label={t('Age')} value={f.age} onChange={put('age')} inputMode="numeric" />
        </Q>
        <Q id="wf-height" label={t('Height')} bad={bad('height')}>
          {lb
            ? <div className="wf-pair">
                <Num label={t('Height') + ' (ft)'} value={f.ft} onChange={put('ft')} unit="ft" inputMode="numeric" />
                <Num label={t('Height') + ' (in)'} value={f.inch} onChange={put('inch')} unit="in" inputMode="numeric" />
              </div>
            : <Num label={t('Height')} value={f.cm} onChange={put('cm')} unit="cm" inputMode="numeric" />}
        </Q>
        <Q id="wf-weight" label={t('Body weight')} bad={bad('weight')}>
          <Num label={t('Body weight')} value={f.weight} onChange={put('weight')} unit={lb ? 'lb' : 'kg'} />
        </Q>
      </div>

      <Q id="wf-goal" label={t('Goal')} bad={bad('goal')}>
        <Choice labelledby="wf-goal" options={GOALS.map(([v, l]) => [v, t(l)])} value={f.goal} onChange={put('goal')} />
      </Q>

      <Q id="wf-level" label={t('Experience')} bad={bad('level')}>
        <Choice labelledby="wf-level" options={LEVELS.map(([v, l]) => [v, t(l)])} value={f.level} onChange={put('level')} />
      </Q>

      <Q id="wf-days" label={t('Days per week')} bad={bad('days')}>
        <Choice labelledby="wf-days" options={DAYS.map(d => [d, String(d)])} value={f.days} onChange={put('days')} />
      </Q>

      <Button variant="primary" type="submit" className="wf-go">{submit}</Button>
    </form>
  )
}

/** First open: nothing but the questions. Saving them is what lets the app through (App.jsx). */
export default function Welcome() {
  return (
    <div className="narrow welcome">
      <div className="welcome-mark"><Icon name="dumbbell" /></div>
      <div className="wf-l">{t('Welcome')}</div>
      <h1 className="welcome-h">{APP_NAME}</h1>
      <p className="muted welcome-sub">{t('A few questions so the app fits you. It takes a minute.')}</p>
      <ProfileForm submit={t('Start training')} />
      <p className="dim small welcome-foot"><Icon name="lock" /> {t('Saved on this device only. Nothing is sent anywhere.')}</p>
    </div>
  )
}

/** Settings → Your profile: the same questions, with the answers given so far. */
export function openProfileSheet() {
  useUI.getState().openSheet(close => (
    <div className="kb-lift">
      <h3>{t('Your profile')}</h3>
      <ProfileForm submit={t('Save')} onSaved={() => { close(); useUI.getState().toast(t('Saved')) }} />
    </div>
  ))
}

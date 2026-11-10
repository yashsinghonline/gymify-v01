# Neon Lime Performance Mobile

The design Gymify's web app is drawn to. This file is a condensed record of the brief the
fork was given, followed by how each part of it lands in the code. Where the app departs
from the brief, the departure and its reason are listed under [Departures](#departures).

One idea carries the whole look: **a dark, flat interface with a single lime accent that
is used rarely.** Lime means "this is live, this is yours, press here". Everything else is
a cool near-black or a grey.

## Colors

| Role | Value | Used for |
| --- | --- | --- |
| primary | `#CCFF00` | the accent: text, icons, hairlines, small filled shapes |
| on-primary | `#0A0A0A` | text and icons on a lime fill |
| surface | `#0F1115` | the page |
| surface-alt | `#181B21` | cards, list rows |
| surface-muted | `#2A2F38` | wells, secondary buttons, inactive fills |
| on-surface | `#F0F2F5` | text |
| on-surface-variant | `#9CA3AF` | secondary text; a third tier is this at 60% |
| border | `#22262E` | every hairline |
| error | `#FF3B30` | negative deltas and destructive actions, nothing else |
| chart-1 … chart-5 | `#CCFF00` `#A3CC00` `#7A9900` `#526600` `#293300` | data only |

Rules:

- One accent. No second hue, no status greens or oranges.
- Lime covers about 5% of a screen. It is never a card or surface fill and never body text.
- Lime may appear as text, an icon, a hairline (`primary/30`), a tint (`primary/10–20`) or a
  small filled shape.

## Typography

| Voice | Face | Sizes |
| --- | --- | --- |
| Display, headlines, numerals, button labels | Space Grotesk | display 96 / 72 / 48, tight tracking; headline 30 / 20 / 16, weight 700; stat numeral 30 |
| Body, labels, tab labels | Manrope | body 14 / 12, weight 500; label 12 uppercase, weight 700, tracking 0.2em; micro 10; tab 10 |
| Measurements, timestamps | JetBrains Mono | 14 / 10, weight 500; never body copy |

- Numbers that change are tabular.
- A tracked uppercase kicker sits above every metric, section and card group. Kickers do
  the dividing; rules and boxes do not.
- Units are smaller than their number and in on-surface-variant.
- Italic black appears on one element per screen.

## Shape and spacing

- Radii: 4, 6, 10, **12** (card, chip, list row), **16** (main button, prominent card),
  **20** (stat tile), 28 (hero frame), **40** (top of a bottom sheet), full (icon buttons,
  avatars, badge pills, progress tracks).
- Chips are 12px rectangles, never pills.
- Spacing steps 4 / 8 / 16 / 24 / 32 / 48. Gutter 20, card padding 20, 32 between sections.

## Components

| Component | Recipe |
| --- | --- |
| Card | surface-alt, 1px border, no shadow |
| Primary button | lime fill, on-primary label, radius 16, lime glow; at most one per screen |
| Quiet primary | `primary/10` fill, lime label, no glow |
| Secondary button | surface-muted, border |
| Icon button | 40px circle, surface-muted, border |
| Input | surface-alt, border, lime focus ring, radius 12 |
| Chip, active | surface-muted fill, lime content |
| Badge pill | `primary/20` fill, `primary/30` border, lime micro label |
| Progress bar | 4px surface-muted track, lime fill |
| Top bar | surface at 80% with backdrop blur and a hairline |
| Tab bar | surface at 90% with blur and a top hairline; the active tab is a lime bold icon and lime label, no pill, no underline |

## Elevation

Flat, with glow. Light comes from an element; nothing casts a shadow.

- Glow on three things only: the primary button (`0 10px 30px` lime at 20%), the current
  or best bar of a chart (`0 0 10px` at 30%), a live progress fill (`0 0 8px` at 60%).
- No drop shadows on cards, rows or chips. No decorative gradients, sparkles or blobs.

## Icons

The [Solar](https://www.figma.com/community/file/1166831539721848736) set: `linear` by
default, `bold` for the active tab and inside filled buttons, 24px, stroke 1.5.

## Imagery

For any generated picture: a glowing lime line on a near-black ground, two colours only.
The app ships none.

---

## Where it lives

| What | File |
| --- | --- |
| The palette as data | `frontend/src/lib/brand.js` (`PALETTE`, `ACCENT`) |
| The palette as tokens, both themes | `frontend/src/index.css`, top |
| Fonts | `frontend/src/type.css`, `frontend/src/fonts/` |
| Type, radii, chrome, buttons, glows | `frontend/src/design.css` |
| Solar icons | `frontend/src/components/solar-icons.js`, drawn by `components/Icon.jsx` |
| The guard | `frontend/src/palette.test.js` |

`design.css` is a layer over the base stylesheet `index.css` and names no colour of its own, so
the look can be changed or replaced without touching the base. `palette.test.js` fails
with the file and line if any stylesheet, component or print document names a colour that
is not in the tables above.

## Departures

| Brief | App | Why |
| --- | --- | --- |
| Dark only | A light theme is kept | The app has a theme setting and follows the system. Light is derived: surfaces inverted, lime stepped down its own ramp (`#A3CC00` fill, `#526600` text) because `#CCFF00` on white is 1.1:1. Glows are off in light. |
| Display weight 900 | 700 | Space Grotesk stops at 700. |
| Italic black | Slanted 700 | Space Grotesk has no italic; the browser slants it. Used on the screen title only. |
| Body 14px, display 48–96px | Body 16px, largest title 40px | The app is dense (set tables, long settings lists) and scales with the reader's text size. The scale keeps the brief's proportions one step down. |
| Primary button 64px high | 56px | A 64px bar crowds the sheet footers on a 390pt phone. The header's Finish button is the quiet 40px form. |
| Error `#FF3B30` | `#C33129` in the light theme | The brief's red is 3.2:1 on a light page. |
| Solar for every icon | 100 Solar icons, 26 kept as drawn | Solar has no muscle groups, gym machines, kettlebell, NFC and a few more. Plus, minus, check and close stay hand-drawn at the same stroke. |
| Tracked uppercase labels | Not tracked in Arabic, Hindi, Bengali, Thai | Letter-spacing breaks joined and stacked scripts. |
| All text in the three faces | Latin, Greek and Vietnamese only; Cyrillic headings fall to Manrope | Space Grotesk has no Cyrillic. Other scripts use the system font. |
| Two-colour imagery | Exercise drawings unchanged | Their licence allows them only unmodified (`NOTICE.md`): shown through a greyscale filter, never redrawn. |

## Keeping it to the palette

`frontend/src/palette.test.js` reads every stylesheet, component and print document and fails,
with file and line, on any colour outside the design: neutrals and the cool near-neutrals of the
surface stack may be written anywhere; the lime ramp and the red only in the four files that
define them. It also checks that the tokens match `brand.js`, that `design.css` names no colour,
and that the fonts and their licences are in place. `frontend/src/lib/brand.test.js` keeps the
name.

```sh
cd frontend
npx vitest run src/palette.test.js                                # what is off the palette
node ../scripts/greyscale/desaturate.mjs src/path/to/file.css     # first draft: same lightness, no hue
```

`scripts/greyscale/emoji-font.py` rebuilds `mono-emoji.css` and the font files from the
`@fontsource-variable/noto-emoji` package.

## What the design does not reach

- **Exercise pictures.** Shown through a greyscale filter in `index.css`; the files are untouched.
- **An emoji you type** into a routine name, on a share card, the first time it is drawn: a canvas
  does not wait for the font. It is right from the second drawing on.
- **Print documents** open in a window of their own with the system's fonts, so an emoji typed
  into a note prints as the printer's system draws it.
- **What a phone's system draws** for a native build from `frontend/android` or `frontend/ios`:
  home-screen name and icon, splash screen, widgets, watch apps. Those shells were not adapted.


# Gymify

A workout tracker that runs in the browser: plan a week, log sets, watch the numbers move.
Dark, flat, one lime accent.

It works as a plain static site. There is no server to run and no account to make.

## Your data

- The first time the app opens it asks eight things: name, age, sex, height, weight, goal,
  experience and training days per week. All of them can be changed later in
  **Settings → Account → Your profile**.
- The answers, and everything logged afterwards, are stored in that browser on that device
  (`localStorage`, under `gym_state_v1`). Nothing is sent anywhere: the first-run screen and the
  profile code make no network request, and a test (`frontend/src/lib/me.test.js`) keeps it so.
- The app starts empty. There is no sample data.
- Because the data lives in the browser, clearing the browser's site data deletes it, and a
  second device starts from zero. **Settings → Data & backup** exports a file that can be
  imported on another device.

## Run it

Needs Node 22. Node 20 also works, with a version warning from npm.

```sh
bash run.sh              # builds, then serves http://localhost:4173
PORT=8080 bash run.sh
```

While working on it:

```sh
cd frontend
npm ci
VITE_DEMO=1 npm run dev  # live reload
npm test                 # on a small machine: npx vitest run --maxWorkers=2 --shard=1/6 … 6/6
```

`VITE_DEMO=1` is the switch for the device-only build described above
(`frontend/src/lib/demo.js`). Without it the app expects the server in `api/` and shows a
sign-in screen instead of the first-run questions.

## Put it online for free

**Vercel, from GitHub.** The step-by-step guide is [PUBLISH.md](PUBLISH.md). In short: push
this folder to a new GitHub repository, import that repository at vercel.com/new, set
**Root Directory** to `frontend`, deploy. Every later push republishes.

**GitHub Pages.** In the repository: **Settings → Pages → Source: GitHub Actions**, then
**Actions → Publish to GitHub Pages → Run workflow**. The address is
`https://<you>.github.io/<repository>/`.

**Any other static host** (Netlify, Cloudflare Pages, a plain web server): run `npm ci` in
`frontend/`, then `bash scripts/build-site.sh`, and publish the `frontend/dist` folder.

Build settings, all optional:

| Variable | What it does |
|---|---|
| `VITE_SOURCE_URL` | Address of your repository. Adds a "Source code" link on the About page. Vercel and the Pages workflow set it for you. |
| `GYMIFY_MEDIA` | `0` publishes without the exercise pictures. |
| `VITE_RELEASES_REPO` | `owner/name` of a GitHub repository whose releases the app should check for updates. Unset, the app never asks. |
| `VITE_APP_URL` | The public address, for a build that does not run at it (an Android or iOS shell), so shared routine links point there. |

## Exercise pictures

The 6,554 exercise pictures and animations are not stored in this folder (216 MB). To add them:

```sh
bash scripts/fetch-media.sh
```

That downloads `catalogue/media` and `catalogue/exercises` and leaves no git repository or
remote behind. Without them the app works and shows exercises as text.

A site build (`scripts/build-site.sh`, so Vercel and GitHub Pages) does not need this step: it
uses `catalogue/media` when the folder is in the repository and downloads the pictures itself
when it is not. Committing the folder makes your builds independent of that download.

The pictures are not yours and not covered by the code's licence. Read the next section before
publishing a copy that includes them.

## Licence and credits

Gymify is a modified version of **openGym**, © 2026 Duarte Santos, licensed under the
**GNU Affero General Public License v3.0 or later** ([LICENSE](LICENSE)). Gymify is licensed
under the same terms. The changes were made in November 2026: the name, the visual design
([DESIGN.md](DESIGN.md)), the first-run profile, and the removal of sample data and of links to
the original project's services.

What that licence asks of anyone who publishes a copy:

- Keep `LICENSE`, `NOTICE.md` and the notice at the bottom of **Settings → About**.
- Make the source of your version available to the people who use it. A public repository and
  `VITE_SOURCE_URL` do that.

**The exercise media has its own terms.** The pictures and animations are © Aliaksandr
Makatserchyk, Gym visual (gymvisual.com). They were licensed for use in openGym only and are not
under the AGPL. `NOTICE.md` has the full text. In short:

- A non-commercial copy may keep the media unmodified, at its 180 px size, together with that
  notice and the credit line the app shows.
- Any commercial use, or any use that drops the notice, needs a licence of your own from
  gymvisual.com.
- The media may not be used to train or prompt AI models.

If you want a copy with no such notice at all, publish it without `catalogue/media` or with
pictures you have the rights to.

Other third-party work (fonts, icons, body diagram, QR code libraries) is listed in
[NOTICE.md](NOTICE.md).

## What is in this folder

| Path | What it is |
|---|---|
| `frontend/` | The app (React, Vite). This is what gets published. |
| `frontend/src/views/Welcome.jsx`, `frontend/src/lib/me.js` | The first-run questions and the profile behind them. |
| `frontend/src/lib/brand.js` | Name, palette and accent in one place. |
| `frontend/src/design.css`, `DESIGN.md` | The visual design and its reference. |
| `catalogue/`, `scripts/catalogue/` | Exercise data and the scripts that build it into the app. |
| `scripts/greyscale/serve.mjs` | The small static server `run.sh` uses. |
| `scripts/fetch-media.sh` | Download of the exercise media. |
| `scripts/build-site.sh` | The build a host runs: the app, the source link, the pictures. |
| `PUBLISH.md`, `frontend/vercel.json` | Publishing on Vercel. The `vercel.json` at the top only stops a deployment made from the wrong folder. |
| `.github/workflows/pages.yml` | Publishing to GitHub Pages. |

Also here, unchanged from the original project and still carrying its name inside: the optional
server (`api/`, `web/`, `mcp/`, `docker-compose.yml`, `helm/`, `kubernetes/`), its documentation
(`docs/`), the watch app (`watch-zepp/`), the Android and iOS shells (`frontend/android`,
`frontend/ios`) and the release scripts in `scripts/`. The published web app uses none of them.
They are kept so a server-backed or native build stays possible; they were not adapted or tested
for Gymify, and deleting them does not affect the site.

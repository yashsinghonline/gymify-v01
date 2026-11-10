#!/usr/bin/env bash
# Builds the publishable site into frontend/dist. This is what a host runs (Vercel through
# frontend/vercel.json, GitHub Pages through .github/workflows/pages.yml). On your own computer
# run.sh builds and serves in one go.
#
#   bash scripts/build-site.sh        after `npm ci` in frontend/
#
# What it adds to a plain `vite build`:
#
#   VITE_DEMO=1        the device-only app: no server, no accounts, starts empty, asks who is
#                      training on first open and keeps everything in the visitor's browser.
#   VITE_SOURCE_URL    a "Source code" link on the About page, which the licence asks for when
#                      other people use your copy. On Vercel it is worked out from the GitHub
#                      repository the project was imported from; set it yourself to override.
#   the pictures       the exercise stills and animations. Taken from catalogue/media when that
#                      folder is in the repository; otherwise downloaded during the build
#                      (scripts/fetch-media.sh, about 216 MB, under a minute). If the download
#                      fails the site is still published, with exercises as text.
#                      GYMIFY_MEDIA=0 skips them. They have a licence of their own: NOTICE.md.
set -euo pipefail
cd "$(dirname "$0")/.."

if [ -z "${VITE_SOURCE_URL:-}" ] && [ "${VERCEL_GIT_PROVIDER:-}" = github ] \
   && [ -n "${VERCEL_GIT_REPO_OWNER:-}" ] && [ -n "${VERCEL_GIT_REPO_SLUG:-}" ]; then
  export VITE_SOURCE_URL="https://github.com/${VERCEL_GIT_REPO_OWNER}/${VERCEL_GIT_REPO_SLUG}"
fi
echo "Source link: ${VITE_SOURCE_URL:-none (set VITE_SOURCE_URL to the address of your repository)}"

export VITE_DEMO=1
(cd frontend && npx vite build)

# Ten minutes at most for the download, where the machine has `timeout` (a Mac does not).
limit=""
if command -v timeout >/dev/null 2>&1; then limit="timeout 600"; fi
if [ "${GYMIFY_MEDIA:-1}" = 0 ]; then
  echo "Pictures: left out (GYMIFY_MEDIA=0)."
elif [ -d catalogue/media ] || $limit bash scripts/fetch-media.sh --media-only; then
  node scripts/catalogue/stage-media.mjs frontend/dist
else
  echo "Pictures: the download failed, so this build shows exercises as text. Build again to retry."
fi
echo "Site built: frontend/dist"

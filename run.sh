#!/usr/bin/env bash
# Builds Gymify as a static site and serves it on http://localhost:4173.
#
#   bash run.sh
#   PORT=8080 bash run.sh
#
# This is the device-only build (frontend/src/lib/demo.js): no server and no accounts. The app
# starts empty, asks who is training on first open, and keeps everything in the browser.
# Needs Node 20 or newer.
set -euo pipefail
cd "$(dirname "$0")"
PORT="${PORT:-4173}"

cd frontend
[ -d node_modules ] || npm ci --no-audit --no-fund
VITE_DEMO=1 npx vite build
cd ..

if [ -d catalogue/media ]; then
  node scripts/catalogue/stage-media.mjs frontend/dist
else
  echo "No exercise pictures: catalogue/media is not here. bash scripts/fetch-media.sh fetches it."
fi

echo "Gymify on http://localhost:$PORT"
exec node scripts/greyscale/serve.mjs frontend/dist "$PORT"

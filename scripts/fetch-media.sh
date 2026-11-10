#!/usr/bin/env bash
# Fetches the two folders this copy is stored without, to stay small:
#
#   catalogue/media       the exercise pictures and animations (about 216 MB)
#   catalogue/exercises   the exercise source data the catalogue scripts read
#
# They are downloaded from the project Gymify was made from, at the exact commit it was made
# from, into a working folder that is deleted again. Nothing else is fetched and no git
# repository is left behind, so this folder stays free to be a repository of your own.
#
#   bash scripts/fetch-media.sh                the two folders
#   bash scripts/fetch-media.sh --media-only   only the pictures (what a site build needs)
#
# Run it once, then commit both folders to your own repository. From then on this script has no
# job left and can be deleted.
#
# The media is licensed separately from the code, and not to you: read NOTICE.md before you
# publish a copy that includes it.
set -euo pipefail
cd "$(dirname "$0")/.."
# Never stop to ask for a login: on a build machine nobody is there to answer.
export GIT_TERMINAL_PROMPT=0

ORIGIN="${MEDIA_ORIGIN:-https://github.com/DuarteSantos8/openGym.git}"
COMMIT=50ab7f24e3c4ee70e7f26b3beb426f571e03414b

dirs=(catalogue/exercises catalogue/media)
[ "${1:-}" = --media-only ] && dirs=(catalogue/media)
want=()
for dir in "${dirs[@]}"; do [ -d "$dir" ] || want+=("$dir"); done
if [ ${#want[@]} -eq 0 ]; then echo "Already here: ${dirs[*]}"; exit 0; fi

# The working folder sits here rather than in the system's temporary folder: that one is often
# small or kept in memory, and from here the finished folder is moved into place, not copied.
tmp=$(mktemp -d "$PWD/.fetch-media.XXXXXX")
trap 'rm -rf "$tmp"' EXIT
git -C "$tmp" init -q
git -C "$tmp" remote add origin "$ORIGIN"
echo "Looking up the file list ..."
# Without file contents: only the two folders' files are asked for below.
git -C "$tmp" fetch -q --depth 1 --filter=blob:none origin "$COMMIT"

for dir in "${want[@]}"; do
  echo "Fetching $dir ..."
  # All of a folder's files in one request. Left to itself git asks for them one at a time.
  git -C "$tmp" ls-tree -r --format='%(objectname)' "$COMMIT" -- "$dir" \
    | git -C "$tmp" -c fetch.negotiationAlgorithm=noop fetch -q origin --no-tags --no-write-fetch-head \
        --recurse-submodules=no --filter=blob:none --stdin
  # One line per file that could not be written is thousands of lines; the last few say why.
  git -C "$tmp" checkout -q "$COMMIT" -- "$dir" 2> "$tmp/checkout.err" \
    || { tail -n 3 "$tmp/checkout.err" >&2; exit 1; }
  mkdir -p "$(dirname "$dir")"
  mv "$tmp/$dir" "$dir"
done
echo "Done: ${want[*]}"

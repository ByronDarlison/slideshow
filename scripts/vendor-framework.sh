#!/bin/sh
# Copy the canonical MIT framework into the self-contained EOA Cash deck.
set -eu
root="$(CDPATH= cd -- "$(dirname "$0")/.." && pwd)"
dest="$root/decks/eoa-cash/framework"
rm -rf "$dest"
cp -a "$root/framework" "$dest"
echo "Vendored $root/framework -> $dest"

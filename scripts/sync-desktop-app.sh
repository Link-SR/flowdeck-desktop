#!/bin/sh
set -eu

FLOWDECK_PROJECT_DIR="$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)"
FLOWDECK_APP_PATH="$FLOWDECK_PROJECT_DIR/src-tauri/target/release/bundle/macos/Flowdeck.app"
FLOWDECK_BACKUP_PATH="$FLOWDECK_PROJECT_DIR/src-tauri/target/release/bundle/macos/.Flowdeck.app.sync-backup"
FLOWDECK_BUILD_SUCCEEDED=0

if command -v node >/dev/null 2>&1; then
  FLOWDECK_NODE_BIN="$(command -v node)"
elif [ -x "$HOME/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node" ]; then
  FLOWDECK_NODE_BIN="$HOME/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node"
else
  echo "Flowdeck desktop sync requires Node.js 18 or newer." >&2
  exit 1
fi

if ! command -v cargo >/dev/null 2>&1; then
  if [ -x "$HOME/.cargo/bin/cargo" ]; then
    PATH="$HOME/.cargo/bin:$PATH"
    export PATH
  else
    echo "Flowdeck desktop sync requires Cargo. Install Rust from https://rustup.rs/." >&2
    exit 1
  fi
fi

flowdeck_restore_previous_app() {
  FLOWDECK_EXIT_CODE=$?
  trap - 0
  if [ "$FLOWDECK_BUILD_SUCCEEDED" -ne 1 ] && [ -d "$FLOWDECK_BACKUP_PATH" ]; then
    rm -rf -- "$FLOWDECK_APP_PATH"
    mv "$FLOWDECK_BACKUP_PATH" "$FLOWDECK_APP_PATH"
    echo "Desktop build failed; restored the previous Flowdeck.app." >&2
  fi
  exit "$FLOWDECK_EXIT_CODE"
}

trap flowdeck_restore_previous_app 0

cd "$FLOWDECK_PROJECT_DIR"

echo "[1/3] Type-checking Flowdeck..."
"$FLOWDECK_NODE_BIN" node_modules/typescript/bin/tsc -b --pretty false

echo "[2/3] Building the web application..."
"$FLOWDECK_NODE_BIN" node_modules/vite/bin/vite.js build

rm -rf -- "$FLOWDECK_BACKUP_PATH"
if [ -d "$FLOWDECK_APP_PATH" ]; then
  /usr/bin/ditto "$FLOWDECK_APP_PATH" "$FLOWDECK_BACKUP_PATH"
fi

echo "[3/3] Bundling Flowdeck.app..."
"$FLOWDECK_NODE_BIN" node_modules/@tauri-apps/cli/tauri.js build \
  --bundles app \
  --config '{"build":{"beforeBuildCommand":""}}'

if [ ! -x "$FLOWDECK_APP_PATH/Contents/MacOS/flowdeck" ]; then
  echo "Flowdeck.app was not produced at the expected path." >&2
  exit 1
fi

FLOWDECK_BUILD_SUCCEEDED=1
rm -rf -- "$FLOWDECK_BACKUP_PATH"
trap - 0

echo "Flowdeck desktop app is up to date:"
echo "$FLOWDECK_APP_PATH"

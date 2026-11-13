#!/bin/sh
set -eu

FLOWDECK_DOWNLOAD_DIR="$(mktemp -d /tmp/flowdeck-rustup.XXXXXX)"
FLOWDECK_RUSTUP_URL="https://static.rust-lang.org/rustup/dist/aarch64-apple-darwin/rustup-init"

curl --proto '=https' --tlsv1.2 -fsSL -r 0-1426081 "$FLOWDECK_RUSTUP_URL" -o "$FLOWDECK_DOWNLOAD_DIR/part-00" &
FLOWDECK_PID_0=$!
curl --proto '=https' --tlsv1.2 -fsSL -r 1426082-2852163 "$FLOWDECK_RUSTUP_URL" -o "$FLOWDECK_DOWNLOAD_DIR/part-01" &
FLOWDECK_PID_1=$!
curl --proto '=https' --tlsv1.2 -fsSL -r 2852164-4278245 "$FLOWDECK_RUSTUP_URL" -o "$FLOWDECK_DOWNLOAD_DIR/part-02" &
FLOWDECK_PID_2=$!
curl --proto '=https' --tlsv1.2 -fsSL -r 4278246-5704327 "$FLOWDECK_RUSTUP_URL" -o "$FLOWDECK_DOWNLOAD_DIR/part-03" &
FLOWDECK_PID_3=$!
curl --proto '=https' --tlsv1.2 -fsSL -r 5704328-7130409 "$FLOWDECK_RUSTUP_URL" -o "$FLOWDECK_DOWNLOAD_DIR/part-04" &
FLOWDECK_PID_4=$!
curl --proto '=https' --tlsv1.2 -fsSL -r 7130410-8556491 "$FLOWDECK_RUSTUP_URL" -o "$FLOWDECK_DOWNLOAD_DIR/part-05" &
FLOWDECK_PID_5=$!
curl --proto '=https' --tlsv1.2 -fsSL -r 8556492-9982573 "$FLOWDECK_RUSTUP_URL" -o "$FLOWDECK_DOWNLOAD_DIR/part-06" &
FLOWDECK_PID_6=$!
curl --proto '=https' --tlsv1.2 -fsSL -r 9982574-11408655 "$FLOWDECK_RUSTUP_URL" -o "$FLOWDECK_DOWNLOAD_DIR/part-07" &
FLOWDECK_PID_7=$!

wait "$FLOWDECK_PID_0" "$FLOWDECK_PID_1" "$FLOWDECK_PID_2" "$FLOWDECK_PID_3" "$FLOWDECK_PID_4" "$FLOWDECK_PID_5" "$FLOWDECK_PID_6" "$FLOWDECK_PID_7"

cat "$FLOWDECK_DOWNLOAD_DIR"/part-* > /tmp/flowdeck-rustup-init
curl --proto '=https' --tlsv1.2 -fsSL "${FLOWDECK_RUSTUP_URL}.sha256" -o /tmp/flowdeck-rustup-init.sha256

FLOWDECK_EXPECTED_HASH="$(cut -d ' ' -f 1 /tmp/flowdeck-rustup-init.sha256)"
FLOWDECK_ACTUAL_HASH="$(shasum -a 256 /tmp/flowdeck-rustup-init | cut -d ' ' -f 1)"
test "$FLOWDECK_EXPECTED_HASH" = "$FLOWDECK_ACTUAL_HASH"
test "$(wc -c < /tmp/flowdeck-rustup-init | tr -d ' ')" = "11408656"
chmod 700 /tmp/flowdeck-rustup-init

echo "rustup-init verified: $FLOWDECK_ACTUAL_HASH"

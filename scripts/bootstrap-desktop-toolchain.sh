#!/bin/sh
set -eu

FLOWDECK_TOOLCHAIN_DIR="$(pwd)/.toolchains"
export CARGO_HOME="${FLOWDECK_TOOLCHAIN_DIR}/cargo"
export RUSTUP_HOME="${FLOWDECK_TOOLCHAIN_DIR}/rustup"
export PATH="${CARGO_HOME}/bin:${PATH}"

/bin/sh scripts/download-rustup-init.sh
cp /tmp/flowdeck-rustup-init /tmp/rustup-init
chmod 700 /tmp/rustup-init
/tmp/rustup-init -y --profile minimal --default-toolchain stable --no-modify-path
rustup show
cargo --version

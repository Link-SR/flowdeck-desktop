# Flowdeck project instructions

- After any change that affects the application (`src/`, `src-tauri/`, build configuration, or app assets), run `sh scripts/sync-desktop-app.sh` before reporting completion.
- Treat a successful desktop sync as part of the definition of done. Confirm that `src-tauri/target/release/bundle/macos/Flowdeck.app` exists and is executable.
- The user's Desktop `Flowdeck.app` entry points to that bundle, so keep the bundle path stable.
- Do not generate or update the DMG during routine changes unless the user explicitly requests an installer.
- Keep the bundle identifier `com.flowdeck.workbench` unchanged so the existing local workspace data remains available.

# Reels Audio Controller

## Stack
- Language/runtime: Vanilla JavaScript (ES2023), no transpiler
- Framework: None. Chrome Extension, Manifest V3. Content-script based; no
  service-worker logic beyond the manifest default.
- Package manager: None — zero dependencies, zero build step. npm is not used.
- Commands: No build. Load via `chrome://extensions` → Developer mode →
  "Load unpacked" → select the project root (manifest.json lives there).

## Conventions
- Folder layout: `content/` (content scripts + injected UI), `manifest.json`
  in the root, `content/` assets (CSS) alongside their scripts.
- Naming: kebab-case file names; camelCase variables/functions; one module per
  feature area (`scrubber.js`, `volume.js`, `speed.js`, `playpause.js`,
  wired together by `main.js`).
- Commit style: Conventional Commits (feat:, fix:, chore:), one logical step
  per commit.

## Data model
- Settings (default playback speed, remembered volume) persist in
  `chrome.storage.local` — no server, no other persistence.
- Per-video runtime state (current time, duration, paused) lives in memory,
  driven by the `<video>` element it is bound to.

## Context
- Purpose: overlay player controls on Instagram Reels (web): timeline
  scrubbing like YouTube, volume control, playback speed, play/pause.
- Instagram's DOM/class names change constantly. NEVER hardcode IG-specific
  CSS selectors as the primary mechanism — bind functions to generic
  `<video>` elements found within the reels viewing surface and resolve UI
  anchors defensively (closest sensible container). If the DOM layout breaks,
  the fix is a resilient anchor strategy, not more matched class names.
- The injected control bar is our own shadow-DOM/positioned overlay on the
  active video; it must not fight IG's own gesture layer (clicks on our overlay
  stop propagation).
- Only these host permissions: `instagram.com` (reels surface). Nothing
  broader.

## Definition of done
- Extension loads unpacked with zero errors on `chrome://extensions`.
- On `instagram.com/reels/*` with a playing reel: scrub, volume, speed, and
  play/pause all verified end-to-end in a real browser (agent-browser or
  Playwright), no console errors.
- Controls survive scrolling to the next reel (rebind to the new active
  video) — this is the flow most likely to break.

## Out of scope
- Firefox/Safari support, Chrome Web Store publishing, automatic updates.
- Downloading or harvesting reels in any way.
- Mobile / Instagram native app.
- Post-DM-grid surfaces other than reels viewing (explore-grid playback is
  best-effort only).

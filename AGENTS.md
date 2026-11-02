# Instarols (Instagram Reels controls)

## Stack
- Stack: Vanilla JavaScript (ES2023), no transpiler. Chrome Extension, Manifest V3 — single
  manifest works for Chrome, Edge, and Firefox via the `browser.*` API namespace. Safari
  requires separate Apple Developer / App Store packaging (not covered by this manifest).
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
- Persisted last volume and default speed in `browser.storage.local` — survives reloads and reel-to-reel scrolling. No server, no other persistence.
- Per-video runtime state (current time, duration, paused) lives in memory,
  driven by the `<video>` element it is bound to.

## Context
- Purpose: Instarols — overlay player controls on Instagram Reels (web):
  timeline scrubbing like YouTube, volume control, playback speed, play/pause.
- Instagram's DOM/class names change constantly. NEVER hardcode IG-specific
  CSS selectors as the primary mechanism — bind functions to generic
  `<video>` elements found within the reels viewing surface and resolve UI
  anchors defensively (closest sensible container). If the DOM layout breaks,
  the fix is a resilient anchor strategy, not more matched class names.
- The injected control bar is our own shadow-DOM/positioned overlay on the
  active video; it must not fight IG's own gesture layer (clicks on our overlay
  stop propagation).
- Native control collision: Instagram has its own audio/mute controls. Instarols
  must never overlap or block them — map native widget positions before
  docking our bar docked under/around them; the native mute button stays
  fully clickable (our volume extends, not replaces).
- Reveal is intent-based: the bar appears only when the pointer approaches the
  lower band of the video with intent (enter-then-settle), and hides on idle,
  leave, or scroll. It must also behave responsively: recompute layout on
  window/video resize (ResizeObserver) and auto-hide when the viewing area is
  too small (explore-grid preview tiles never get controls — only the engaged
  reel does).
- Only these host permissions: `instagram.com` (reels surface). Nothing broader.
- Browser support: Chrome / Edge / Firefox via one Manifest V3 manifest (`browser.*` APIs).
  Safari is **not** covered — Safari Web Extensions require an Apple Developer account
  ($99/year), Xcode packaging, and App Store distribution with a Safari-specific manifest.

## Definition of done
- Extension loads unpacked with zero errors on `chrome://extensions` (Chrome/Edge) or
  `about:debugging` (Firefox).
- On `instagram.com/reels/*` with a playing reel: scrub, volume, speed, and
  play/pause all verified end-to-end in a real browser (agent-browser or
  Playwright), no console errors.
- Controls survive scrolling to the next reel (rebind to the new active
  video) — this is the flow most likely to break.

## Out of scope
- Firefox/Safari native packaging, automatic updates, Safari App Store submission.
- Downloading or harvesting reels in any way.
- Mobile / Instagram native app.
- Post-DM-grid surfaces other than reels viewing (explore-grid playback is
  best-effort only).

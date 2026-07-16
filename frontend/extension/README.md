# AI Security Armor — Chrome Extension (Manifest V3)

Primary client. Assesses the current page URL and Gmail emails via the local
Security Gateway, shows a risk badge, and blocks risky link clicks.

## Load (development)

1. Start the gateway: `uvicorn backend.main:app --port 8000` (from repo root).
2. Chrome → `chrome://extensions` → enable **Developer mode**.
3. **Load unpacked** → select `frontend/extension/`.
4. (Icons) Add PNGs at `icons/icon16.png`, `icon48.png`, `icon128.png`, or remove the
   `icons`/`action.default_icon` keys from `manifest.json` while developing.

## Architecture

- `background.js` — service worker; brokers all gateway calls, caches per-tab results,
  updates the toolbar badge, degrades gracefully when the gateway is offline.
- `content/page_scanner.js` — intercepts risky link clicks (Shadow-DOM toast, isolated CSS).
- `content/gmail_scanner.js` — extracts the open email + sender, injects a risk banner.
- `popup/` — shows the current tab's badge, reasons, and evidence.
- `shared/risk.js` — single source of truth for the 0-100 color scale (mirrors web `lib/risk.ts`).
- `shared/api.js` — gateway client (base URL configurable via `chrome.storage.local`).

## Manual test checklist (test-plan.md §7)

- [ ] Load unpacked — no console errors.
- [ ] Open a phishing sample page → badge turns red within ~2s.
- [ ] Open a scam email in Gmail → risk banner appears above the body.
- [ ] Click the icon → popup shows evidence, layout intact (Shadow DOM).
- [ ] Stop the gateway → popup shows "offline", no crash.

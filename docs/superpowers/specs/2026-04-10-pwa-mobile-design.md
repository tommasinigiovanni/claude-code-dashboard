# PWA Mobile — Design Spec

## Problem

When the user opens the dashboard from a mobile browser, it looks and feels like a website — with browser chrome, no home screen icon, and no "app-like" experience. Users want to install it on their phone's home screen and have it open full-screen like a native app.

## Solution

Add Progressive Web App (PWA) support: a web manifest, minimal service worker, and PWA icons. This makes the browser offer "Add to Home Screen" on both iOS and Android. The app opens in standalone mode (no browser bar).

No offline support — the dashboard requires a live WebSocket connection to the server.

## Files

### Create: `public/manifest.json`

```json
{
  "name": "Claude Code Dashboard",
  "short_name": "CCD",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#1a1a2e",
  "theme_color": "#1a1a2e",
  "icons": [
    { "src": "/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icon-512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```

### Create: `public/sw.js`

Minimal service worker that satisfies PWA install criteria:

```js
self.addEventListener('fetch', () => {})
```

### Create: `public/icon-192.png` and `public/icon-512.png`

Resized versions of the existing `public/app-icon.png`.

### Modify: `index.html`

Add in `<head>`:
```html
<link rel="manifest" href="/manifest.json">
<meta name="theme-color" content="#1a1a2e">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<link rel="apple-touch-icon" href="/icon-192.png">
```

Add before closing `</body>`:
```html
<script>
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js')
  }
</script>
```

### Modify: `src/services/transport/index.ts`

Persist the auth token in localStorage so the PWA works when opened from home screen (where `start_url` is `/` without `?token=`):

```typescript
// On first load with ?token=, save it
const urlToken = new URLSearchParams(location.search).get('token')
if (urlToken) {
  localStorage.setItem('ccd-token', urlToken)
}
// Use saved token as fallback
const token = urlToken || localStorage.getItem('ccd-token') || ''
```

## Behavior

- Chrome Android: shows "Add to Home Screen" banner automatically after criteria met
- iOS Safari: user taps Share > Add to Home Screen
- Desktop Chrome: shows install icon in address bar
- App opens in standalone mode (no browser chrome)
- Token persisted in localStorage — no need to re-enter after first visit

## Verification

1. Build: `VITE_TRANSPORT=websocket npm run build`
2. Start server, open on phone browser
3. Chrome: verify install banner appears; install and verify standalone mode
4. iOS: verify Add to Home Screen works via Share menu
5. Verify token persists — close and reopen from home screen, should auto-connect

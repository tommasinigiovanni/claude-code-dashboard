# Telegram Mini App — Design Spec

## Problem

The user accesses the dashboard from mobile via browser. Telegram Mini Apps provide a more integrated experience — the dashboard opens directly inside Telegram with automatic authentication, no token to remember.

## Solution

Configure the existing Telegram bot to open the dashboard as a Mini App. Add `initData` validation on the server for Telegram-based auth. The same React frontend is reused — it detects the Telegram WebApp environment and authenticates automatically.

## Architecture

```
Telegram App (phone)
  |
  | user taps "Open Dashboard" menu button
  v
Telegram WebView (Mini App)
  |
  | loads https://dashboard.example.com/
  | window.Telegram.WebApp available
  v
Frontend detects Telegram → POST /tg-auth with initData
  |
  v
ccd-server validates initData via HMAC-SHA256(bot_token)
  |
  | returns session token
  v
Frontend connects WebSocket with ?tg_session=<token>
  |
  v
Normal dashboard operation
```

## Changes

### Backend: `ccd-server/src/main.rs`

New CLI flag:
```
--bot-token <TOKEN>    Telegram bot token for Mini App auth [env: CCD_BOT_TOKEN]
```

When `--bot-token` is provided, Mini App auth is enabled.

### Backend: New endpoint `POST /tg-auth`

Receives Telegram `initData` string in the request body. Validates it using the standard Telegram algorithm:

1. Parse `initData` as URL-encoded key-value pairs
2. Extract the `hash` field
3. Build the data-check-string: sort remaining key-value pairs alphabetically, join with `\n` as `key=value`
4. Compute `secret_key = HMAC-SHA256("WebAppData", bot_token)`
5. Compute `hash_check = HMAC-SHA256(secret_key, data_check_string)`
6. Compare `hash_check` hex with `hash` — if equal, data is authentic
7. Check `auth_date` is not older than 5 minutes

On success, return a JSON session token `{ "token": "<uuid>" }` that the frontend uses for the WebSocket connection.

The server stores active Telegram sessions in a `HashMap<String, TgSession>` (token → user info + expiry). Sessions expire after 24 hours.

### Backend: WebSocket auth update

The WebSocket upgrade handler at `/ws` accepts two auth methods:
- `?token=xxx` — static token (existing, for browser access)
- `?tg_session=xxx` — Telegram session token (new, from `/tg-auth`)

Either one is sufficient. Both are validated before upgrading.

### Frontend: `src/services/transport/index.ts`

Update `getTransport()`:

```typescript
// Priority:
// 1. If Telegram WebApp detected → call /tg-auth, use tg_session
// 2. If ?token= in URL → use static token
// 3. If token in localStorage → use static token
// 4. Show token gate login screen
```

The Telegram auth flow:
1. Check `window.Telegram?.WebApp?.initData`
2. If present, `POST /tg-auth` with `initData` as body
3. On success, connect WebSocket with `?tg_session=<returned_token>`
4. On failure, fall back to token gate

### Frontend: Telegram theme adaptation

When `window.Telegram?.WebApp` is detected:
- Call `Telegram.WebApp.ready()` to signal the app is loaded
- Call `Telegram.WebApp.expand()` to use full screen height
- Read `Telegram.WebApp.themeParams` for colors (optional — our dark theme already works well)

### Bot: Menu Button registration

In `ccd-core/src/telegram.rs`, during `telegram_start_bot`, register the Mini App menu button:

```
POST /bot<token>/setChatMenuButton
{
  "menu_button": {
    "type": "web_app",
    "text": "Dashboard",
    "web_app": { "url": "https://dashboard.example.com/" }
  }
}
```

This requires a new parameter: the dashboard URL. Added as `dashboard_url: Option<String>` to `telegram_start_bot`.

The `/start` command also sends an inline keyboard button that opens the Mini App:
```json
{
  "text": "Open Dashboard",
  "web_app": { "url": "https://dashboard.example.com/" }
}
```

### Configuration

New settings needed:
- `CCD_BOT_TOKEN` env var / `--bot-token` CLI flag on ccd-server
- Dashboard URL needs to be configured for the bot's menu button registration

The bot token is the same one already used for the Telegram bot in settings — it's now also passed to ccd-server for `initData` validation.

## What Does NOT Change

- The React frontend is the same — no separate Mini App frontend
- Browser access with static token continues to work
- The bot's text-based chat (`claude --print`) continues to work
- The PWA install from browser continues to work
- Desktop Tauri app is unaffected

## Security

- `initData` is cryptographically signed by Telegram — cannot be forged
- Session tokens expire after 24 hours
- `auth_date` must be within 5 minutes to prevent replay attacks
- The `allowed_chat_id` filter in the bot also applies — only authorized users can use the Mini App

## Verification

1. Set `--bot-token` on ccd-server
2. Open bot in Telegram → see "Dashboard" menu button
3. Tap → Mini App opens with dashboard
4. WebSocket connects automatically (no token prompt)
5. All dashboard features work inside Telegram WebView
6. Browser access with `?token=` still works
7. Bot text commands (`/help`, `/sessions`, etc.) still work

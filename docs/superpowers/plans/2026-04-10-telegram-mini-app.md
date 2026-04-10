# Telegram Mini App Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Open the Claude Code Dashboard as a Telegram Mini App with automatic authentication via `initData`.

**Architecture:** Add `initData` HMAC validation endpoint to ccd-server, update the frontend transport to detect Telegram WebApp and auto-authenticate, update the bot to register a Menu Button that opens the Mini App.

**Tech Stack:** Rust (HMAC-SHA256 via `hmac` + `sha2` crates), TypeScript, Telegram Bot API, Telegram WebApp JS SDK.

**Spec:** `docs/superpowers/specs/2026-04-10-telegram-mini-app-design.md`

---

## File Structure

### New files
| File | Responsibility |
|------|---------------|
| `ccd-server/src/tg_auth.rs` | Telegram initData validation + session management |

### Modified files
| File | Change |
|------|--------|
| `ccd-server/Cargo.toml` | Add `hmac`, `sha2`, `hex` dependencies |
| `ccd-server/src/main.rs` | Add `--bot-token` CLI flag, `/tg-auth` route, pass bot_token to AppState, update WS auth |
| `ccd-server/src/ws.rs` | Accept `tg_session` query param for auth |
| `ccd-core/src/telegram.rs` | Register Mini App menu button + inline button on /start |
| `src/services/transport/index.ts` | Detect Telegram WebApp, auto-authenticate via /tg-auth |
| `src/App.tsx` | Skip token gate when Telegram session is active |

---

## Task 1: Add Telegram initData Validation to ccd-server

**Files:**
- Modify: `ccd-server/Cargo.toml`
- Create: `ccd-server/src/tg_auth.rs`
- Modify: `ccd-server/src/main.rs`

- [ ] **Step 1: Add dependencies to ccd-server/Cargo.toml**

Add under `[dependencies]`:

```toml
hmac = "0.12"
sha2 = "0.10"
hex = "0.4"
uuid = { version = "1", features = ["v4"] }
```

- [ ] **Step 2: Create ccd-server/src/tg_auth.rs**

```rust
use hmac::{Hmac, Mac};
use sha2::Sha256;
use std::collections::HashMap;
use std::sync::Mutex;
use std::time::{SystemTime, UNIX_EPOCH};

type HmacSha256 = Hmac<Sha256>;

pub struct TgSession {
    pub user_id: i64,
    pub created_at: u64,
}

pub struct TgAuthState {
    bot_token: String,
    sessions: Mutex<HashMap<String, TgSession>>,
}

impl TgAuthState {
    pub fn new(bot_token: String) -> Self {
        Self {
            bot_token,
            sessions: Mutex::new(HashMap::new()),
        }
    }

    /// Validate Telegram initData and return a session token.
    pub fn validate_init_data(&self, init_data: &str) -> Result<String, String> {
        // Parse URL-encoded key-value pairs
        let params: Vec<(String, String)> = url::form_urlencoded::parse(init_data.as_bytes())
            .map(|(k, v)| (k.to_string(), v.to_string()))
            .collect();

        // Extract hash
        let hash = params.iter()
            .find(|(k, _)| k == "hash")
            .map(|(_, v)| v.clone())
            .ok_or("Missing hash in initData")?;

        // Build data-check-string: sort remaining pairs alphabetically, join with \n
        let mut check_pairs: Vec<String> = params.iter()
            .filter(|(k, _)| k != "hash")
            .map(|(k, v)| format!("{}={}", k, v))
            .collect();
        check_pairs.sort();
        let data_check_string = check_pairs.join("\n");

        // Compute secret_key = HMAC-SHA256("WebAppData", bot_token)
        let mut secret_mac = HmacSha256::new_from_slice(b"WebAppData")
            .map_err(|e| format!("HMAC error: {}", e))?;
        secret_mac.update(self.bot_token.as_bytes());
        let secret_key = secret_mac.finalize().into_bytes();

        // Compute hash_check = HMAC-SHA256(secret_key, data_check_string)
        let mut check_mac = HmacSha256::new_from_slice(&secret_key)
            .map_err(|e| format!("HMAC error: {}", e))?;
        check_mac.update(data_check_string.as_bytes());
        let computed_hash = hex::encode(check_mac.finalize().into_bytes());

        if computed_hash != hash {
            return Err("Invalid initData signature".to_string());
        }

        // Check auth_date is not older than 5 minutes
        if let Some((_, auth_date_str)) = params.iter().find(|(k, _)| k == "auth_date") {
            let auth_date: u64 = auth_date_str.parse().unwrap_or(0);
            let now = SystemTime::now().duration_since(UNIX_EPOCH).unwrap().as_secs();
            if now - auth_date > 300 {
                return Err("initData expired".to_string());
            }
        }

        // Extract user_id
        let user_id = params.iter()
            .find(|(k, _)| k == "user")
            .and_then(|(_, v)| serde_json::from_str::<serde_json::Value>(v).ok())
            .and_then(|u| u.get("id").and_then(|id| id.as_i64()))
            .unwrap_or(0);

        // Create session
        let token = uuid::Uuid::new_v4().to_string();
        let now = SystemTime::now().duration_since(UNIX_EPOCH).unwrap().as_secs();
        self.sessions.lock().unwrap().insert(token.clone(), TgSession {
            user_id,
            created_at: now,
        });

        // Clean expired sessions (older than 24h)
        self.sessions.lock().unwrap().retain(|_, s| now - s.created_at < 86400);

        Ok(token)
    }

    /// Check if a session token is valid.
    pub fn validate_session(&self, token: &str) -> bool {
        let sessions = self.sessions.lock().unwrap();
        if let Some(session) = sessions.get(token) {
            let now = SystemTime::now().duration_since(UNIX_EPOCH).unwrap().as_secs();
            now - session.created_at < 86400
        } else {
            false
        }
    }
}
```

- [ ] **Step 3: Update ccd-server/src/main.rs**

Add `mod tg_auth;` at the top.

Add to `Args`:
```rust
    /// Telegram bot token for Mini App auth (optional)
    #[arg(long, env = "CCD_BOT_TOKEN")]
    bot_token: Option<String>,
```

Update `AppState`:
```rust
struct AppState {
    token: String,
    tx: broadcast::Sender<emitter::WsMessage>,
    tg_auth: Option<tg_auth::TgAuthState>,
}
```

Update state creation in `main()`:
```rust
    let state = Arc::new(AppState {
        token: args.token.clone(),
        tx,
        tg_auth: args.bot_token.map(|t| tg_auth::TgAuthState::new(t)),
    });
```

Add the `/tg-auth` POST endpoint:
```rust
async fn tg_auth_handler(
    state: Arc<AppState>,
    body: String,
) -> impl IntoResponse {
    let Some(ref tg_auth) = state.tg_auth else {
        return (StatusCode::NOT_FOUND, "Telegram auth not configured").into_response();
    };
    match tg_auth.validate_init_data(&body) {
        Ok(token) => axum::Json(serde_json::json!({ "token": token })).into_response(),
        Err(e) => (StatusCode::UNAUTHORIZED, e).into_response(),
    }
}
```

Add the route to the Router:
```rust
    let app = Router::new()
        .route("/ws", get({ /* existing */ }))
        .route("/tg-auth", axum::routing::post({
            let state = state.clone();
            move |body: String| tg_auth_handler(state, body)
        }))
        .fallback_service(ServeDir::new(&args.static_dir));
```

Update `ws_handler` to accept `tg_session` query param:
```rust
#[derive(serde::Deserialize)]
struct WsQuery {
    token: Option<String>,
    tg_session: Option<String>,
}

async fn ws_handler(
    ws: WebSocketUpgrade,
    Query(query): Query<WsQuery>,
    state: Arc<AppState>,
) -> impl IntoResponse {
    // Check static token
    if let Some(ref token) = query.token {
        if token == &state.token {
            return ws.on_upgrade(move |socket| ws::handle_socket(socket, state.tx.clone()))
                .into_response();
        }
    }
    // Check Telegram session
    if let Some(ref tg_session) = query.tg_session {
        if let Some(ref tg_auth) = state.tg_auth {
            if tg_auth.validate_session(tg_session) {
                return ws.on_upgrade(move |socket| ws::handle_socket(socket, state.tx.clone()))
                    .into_response();
            }
        }
    }
    StatusCode::UNAUTHORIZED.into_response()
}
```

- [ ] **Step 4: Verify ccd-server compiles**

Run: `cargo build -p ccd-server`

- [ ] **Step 5: Commit**

```bash
git add ccd-server/
git commit -m "feat: add Telegram initData validation and session auth to ccd-server"
```

---

## Task 2: Update Bot to Register Mini App Menu Button

**Files:**
- Modify: `ccd-core/src/telegram.rs`

- [ ] **Step 1: Add `dashboard_url` parameter to `telegram_start_bot`**

Change the function signature:

```rust
pub async fn telegram_start_bot(
    emitter: impl EventEmitter,
    bot_token: String,
    allowed_chat_id: Option<i64>,
    project_path: Option<String>,
    auto_approve: Option<bool>,
    dashboard_url: Option<String>,
) -> Result<TelegramBotStatus, String> {
```

- [ ] **Step 2: Register Menu Button after token verification**

After the existing `setMyCommands` call (around line 262 in current file), add:

```rust
    // Register Mini App menu button if dashboard URL is provided
    if let Some(ref url) = dashboard_url {
        let _ = client
            .post(&format!("https://api.telegram.org/bot{}/setChatMenuButton", bot_token))
            .json(&serde_json::json!({
                "menu_button": {
                    "type": "web_app",
                    "text": "Dashboard",
                    "web_app": { "url": url }
                }
            }))
            .send()
            .await;
    }
```

- [ ] **Step 3: Add inline button to /start command**

In the `/start` or `/menu` handler, add a web_app button to the existing inline keyboard. Find the section that handles `text == "/start" || text == "/menu"` and update the buttons array:

```rust
    if text == "/start" || text == "/menu" {
        let mut buttons = vec![
            vec![
                ("📋 Sessioni".to_string(), "cmd:sessions".to_string()),
                ("🆕 Nuova chat".to_string(), "cmd:new".to_string()),
                ("❓ Help".to_string(), "cmd:help".to_string()),
            ],
        ];
        // Add session buttons
        let sessions = get_tmux_sessions();
        for sess in sessions.iter().take(6) {
            let short = sess.replace("claude-", "");
            buttons.push(vec![
                (format!("🔄 {}", short), format!("switch:{}", sess)),
            ]);
        }
        // Build keyboard - add Dashboard web_app button if URL is configured
        let mut keyboard: Vec<Vec<serde_json::Value>> = buttons
            .iter()
            .map(|row| {
                row.iter()
                    .map(|(label, data)| {
                        serde_json::json!({"text": label, "callback_data": data})
                    })
                    .collect()
            })
            .collect();
        if let Some(ref url) = dashboard_url {
            keyboard.insert(0, vec![
                serde_json::json!({"text": "📊 Open Dashboard", "web_app": {"url": url}})
            ]);
        }
```

Note: The `dashboard_url` needs to be accessible inside the tokio::spawn async block. Clone it before the spawn:

```rust
    let dashboard_url_clone = dashboard_url.clone();
```

And use `dashboard_url_clone` inside the spawned task.

- [ ] **Step 4: Update the Tauri wrapper for the new parameter**

In `src-tauri/src/telegram.rs`, update the wrapper to pass the new parameter:

```rust
#[tauri::command]
pub async fn telegram_start_bot(
    app: AppHandle,
    bot_token: String,
    allowed_chat_id: Option<i64>,
    project_path: Option<String>,
    auto_approve: Option<bool>,
) -> Result<TelegramBotStatus, String> {
    let emitter = TauriEmitter(app);
    ccd_core::telegram::telegram_start_bot(emitter, bot_token, allowed_chat_id, project_path, auto_approve, None).await
}
```

The Tauri desktop app passes `None` for `dashboard_url` (no Mini App from desktop).

- [ ] **Step 5: Update ccd-server ws.rs dispatch for the new parameter**

In `ccd-server/src/ws.rs`, find the `telegram_start_bot` command handler and add the `dashboard_url` param extraction:

```rust
        "telegram_start_bot" => {
            let bot_token = params.get("botToken").and_then(|v| v.as_str()).ok_or("Missing botToken")?.to_string();
            let allowed_chat_id = params.get("allowedChatId").and_then(|v| if v.is_null() { None } else { v.as_i64() });
            let project_path = params.get("projectPath").and_then(|v| if v.is_null() { None } else { v.as_str() }).map(|s| s.to_string());
            let auto_approve = params.get("autoApprove").and_then(|v| v.as_bool());
            let dashboard_url = params.get("dashboardUrl").and_then(|v| if v.is_null() { None } else { v.as_str() }).map(|s| s.to_string());
            let result = ccd_core::telegram::telegram_start_bot(emitter.clone(), bot_token, allowed_chat_id, project_path, auto_approve, dashboard_url).await?;
            serde_json::to_value(result).map_err(|e| e.to_string())
        }
```

- [ ] **Step 6: Verify compiles**

Run: `cargo build --workspace`

- [ ] **Step 7: Commit**

```bash
git add ccd-core/src/telegram.rs src-tauri/src/telegram.rs ccd-server/src/ws.rs
git commit -m "feat: register Telegram Mini App menu button and inline dashboard button"
```

---

## Task 3: Update Frontend to Detect Telegram WebApp and Auto-Authenticate

**Files:**
- Modify: `src/services/transport/index.ts`
- Modify: `src/App.tsx`

- [ ] **Step 1: Add Telegram WebApp type declaration**

Create type augmentation at the top of `src/services/transport/index.ts`:

```typescript
declare global {
  interface Window {
    Telegram?: {
      WebApp?: {
        initData: string
        ready: () => void
        expand: () => void
        themeParams?: Record<string, string>
      }
    }
  }
}
```

- [ ] **Step 2: Add Telegram auth helper**

Add to `src/services/transport/index.ts`:

```typescript
const TG_SESSION_KEY = 'ccd-tg-session'

async function getTelegramSession(): Promise<string | null> {
  const tg = window.Telegram?.WebApp
  if (!tg?.initData) return null

  // Signal to Telegram that the app is ready
  tg.ready()
  tg.expand()

  // Check if we already have a valid session
  const existing = localStorage.getItem(TG_SESSION_KEY)
  if (existing) return existing

  // Authenticate with the server
  try {
    const resp = await fetch('/tg-auth', {
      method: 'POST',
      body: tg.initData,
    })
    if (!resp.ok) return null
    const data = await resp.json()
    const token = data.token as string
    localStorage.setItem(TG_SESSION_KEY, token)
    return token
  } catch {
    return null
  }
}
```

- [ ] **Step 3: Update getTransport() to use Telegram session**

Replace the websocket branch in `getTransport()`:

```typescript
export function getTransport(): Transport {
  if (!instance) {
    if (isWebMode()) {
      const wsUrl = import.meta.env.VITE_WS_URL
        || `${location.protocol === 'https:' ? 'wss:' : 'ws:'}//${location.host}/ws`

      // Check for Telegram session first (set by initTelegramAuth)
      const tgSession = localStorage.getItem(TG_SESSION_KEY)
      if (tgSession) {
        instance = new WebSocketTransport(`${wsUrl}?tg_session=${tgSession}`)
        return instance
      }

      // Fall back to static token
      const token = getStoredToken()
      instance = new WebSocketTransport(`${wsUrl}?token=${token}`)
    } else {
      instance = new TauriTransport()
    }
  }
  return instance
}
```

- [ ] **Step 4: Export Telegram detection and init function**

Add exports:

```typescript
export function isTelegramWebApp(): boolean {
  return !!window.Telegram?.WebApp?.initData
}

export async function initTelegramAuth(): Promise<boolean> {
  const session = await getTelegramSession()
  return !!session
}
```

- [ ] **Step 5: Update App.tsx TokenGate to handle Telegram auth**

In `src/App.tsx`, update the `TokenGate` component:

```typescript
import { isWebMode, getStoredToken, setToken, isTelegramWebApp, initTelegramAuth } from '@/services/transport'

function TokenGate({ children }: { children: React.ReactNode }) {
  const [token, setTokenState] = useState(getStoredToken())
  const [input, setInput] = useState('')
  const [tgAuth, setTgAuth] = useState<boolean | null>(null) // null = loading

  // Try Telegram auth on mount
  useEffect(() => {
    if (isWebMode() && isTelegramWebApp()) {
      initTelegramAuth().then((ok) => {
        setTgAuth(ok)
        if (ok) setTokenState('tg') // trigger re-render
      })
    } else {
      setTgAuth(false) // not in Telegram
    }
  }, [])

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault()
    const t = input.trim()
    if (!t) return
    setToken(t)
    setTokenState(t)
  }, [input])

  // Not in web mode, or has token, or Telegram auth succeeded
  if (!isWebMode() || token || tgAuth === true) {
    return <>{children}</>
  }

  // Telegram auth in progress
  if (tgAuth === null) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <p className="text-muted-foreground">Connecting...</p>
      </div>
    )
  }

  // Show token input (not in Telegram, no token)
  return (
    <div className="flex items-center justify-center h-screen bg-background">
      <form onSubmit={handleSubmit} className="flex flex-col items-center gap-4 p-8 rounded-2xl border border-border bg-card max-w-sm w-full mx-4">
        <img src="/app-icon.png" alt="CCD" className="w-16 h-16 rounded-xl" />
        <h1 className="text-lg font-semibold">Claude Code Dashboard</h1>
        <p className="text-sm text-muted-foreground text-center">Enter your access token to connect.</p>
        <input
          type="password"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Token"
          autoFocus
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        />
        <button
          type="submit"
          disabled={!input.trim()}
          className="w-full rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          Connect
        </button>
      </form>
    </div>
  )
}
```

- [ ] **Step 6: Verify frontend compiles**

Run: `npx tsc --noEmit && npm run build`

- [ ] **Step 7: Commit**

```bash
git add src/services/transport/index.ts src/App.tsx
git commit -m "feat: auto-detect Telegram WebApp and authenticate via initData"
```

---

## Task 4: Verification

- [ ] **Step 1: Build everything**

```bash
cargo build --workspace
VITE_TRANSPORT=websocket npm run build
```

- [ ] **Step 2: Test browser access still works**

Start server:
```bash
CCD_TOKEN=test123 ./target/release/ccd-server --port 3100 --static-dir dist
```
Open `http://localhost:3100/?token=test123` — dashboard works as before.

- [ ] **Step 3: Test Telegram Mini App**

To test the Mini App:
1. Start server with bot token:
   ```bash
   CCD_TOKEN=test123 CCD_BOT_TOKEN=your_bot_token ./target/release/ccd-server --port 3100 --static-dir dist
   ```
2. Set the Mini App URL via BotFather: send `/mybots` → select bot → Bot Settings → Menu Button → configure with your dashboard URL
3. Open bot in Telegram → tap the "Dashboard" menu button
4. Verify: Mini App opens, auto-authenticates, dashboard loads

- [ ] **Step 4: Commit any fixes**

```bash
git add -A && git commit -m "fix: Telegram Mini App verification fixes"
```

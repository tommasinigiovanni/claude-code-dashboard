# Web Server Mode — Design Spec

## Problem

Claude Code Dashboard runs as a Tauri desktop app. When the user's Mac is off or they're away, the dashboard is inaccessible. Users want to access the dashboard from their phone while away from their computer, controlling Claude Code sessions on a remote VM.

## Solution

Add a standalone web server binary (`ccd-server`) that exposes the same functionality as the Tauri app over WebSocket + static file serving. Deploy on a dedicated VM with Claude Code installed, accessed via mobile browser through a reverse proxy (Caddy/Nginx) with HTTPS.

## Architecture

```
┌─────────────┐     ┌─────────────────────┐
│  Tauri App  │     │   ccd-server (Axum) │
│  (desktop)  │     │   (VM deployment)   │
└──────┬──────┘     └──────────┬──────────┘
       │                       │
       ▼                       ▼
┌──────────────────────────────────────────┐
│          src-tauri/src/core/             │
│  terminal.rs  chat.rs  config.rs  ...   │
│  (zero Tauri deps, pure Rust logic)     │
└──────────────────────────────────────────┘
```

### Shared Core Module

Extract business logic from current Tauri command files into `src-tauri/src/core/`. The core module has zero Tauri dependencies — only standard Rust + tokio + portable-pty + serde.

Current files to refactor:
- `terminal.rs` → `core/terminal.rs` (PTY spawn, write, resize, session storage)
- `chat.rs` → `core/chat.rs` (chat PTY, ANSI parsing, permission detection)
- `config.rs` → `core/config.rs` (read/write settings.json, dashboard data)
- `ssh.rs` → `core/ssh.rs` (SSH command execution)
- `telegram.rs` → `core/telegram.rs` (bot polling, message handling)
- `backup.rs` → `core/backup.rs` (backup CRUD)
- `profiles.rs` → `core/profiles.rs` (profile CRUD)
- `hooks_manager.rs` → `core/hooks.rs` (hooks read/write)
- `types.rs` → `core/types.rs` (shared data structures)

### EventEmitter Trait

The key abstraction that enables both Tauri and WebSocket backends:

```rust
// core/events.rs
pub trait EventEmitter: Send + Sync + 'static {
    fn emit(&self, event_name: &str, payload: &str);
}
```

Functions that stream data (`terminal_spawn`, `chat_start`) accept `impl EventEmitter` instead of Tauri's `AppHandle`.

**Tauri implementation** (in `src-tauri/src/tauri_commands.rs`):
```rust
struct TauriEmitter(AppHandle);
impl EventEmitter for TauriEmitter {
    fn emit(&self, event_name: &str, payload: &str) {
        let _ = self.0.emit(event_name, payload);
    }
}
```

**WebSocket implementation** (in `ccd-server/src/emitter.rs`):
```rust
struct WsEmitter {
    tx: broadcast::Sender<WsMessage>,
}
impl EventEmitter for WsEmitter {
    fn emit(&self, event_name: &str, payload: &str) {
        let _ = self.tx.send(WsMessage::Event {
            channel: event_name.to_string(),
            payload: payload.to_string(),
        });
    }
}
```

### Tauri Command Wrappers

After extraction, Tauri commands become thin wrappers:

```rust
// src-tauri/src/tauri_commands.rs
#[tauri::command]
pub async fn terminal_spawn(
    app: AppHandle,
    project_path: Option<String>,
    use_tmux: bool,
    // ...
) -> Result<String, String> {
    let emitter = TauriEmitter(app);
    core::terminal::spawn(emitter, project_path, use_tmux, /* ... */).await
}
```

### ccd-server Crate

New crate at project root:

```
ccd-server/
  Cargo.toml
  src/
    main.rs       # CLI: --port, --token, --static-dir
    ws.rs         # WebSocket handler: parse JSON-RPC, dispatch to core
    emitter.rs    # WsEmitter implementation
```

**Dependencies:** axum, tokio, tower-http (serve-dir, cors), serde_json, uuid. References `claude-code-dashboard-core` (path dependency on `src-tauri/`).

**Note on crate structure:** `ccd-server` depends on the existing `src-tauri` crate's core module. The `src-tauri/Cargo.toml` stays as-is — `ccd-server` imports it as a library dependency. No Cargo workspace needed; just a path dependency.

### WebSocket Protocol

Single endpoint: `ws://host:3100/ws?token=SECRET`

**Client → Server (command call):**
```json
{"id": "1", "command": "terminal_spawn", "params": {"projectPath": "/root/proj", "useTmux": false}}
```

**Server → Client (command response):**
```json
{"id": "1", "result": "session-uuid-123"}
```

**Server → Client (command error):**
```json
{"id": "1", "error": "Failed to spawn terminal"}
```

**Client → Server (subscribe to events):**
```json
{"type": "subscribe", "channel": "terminal-output-session-uuid-123"}
```

**Client → Server (unsubscribe):**
```json
{"type": "unsubscribe", "channel": "terminal-output-session-uuid-123"}
```

**Server → Client (event push):**
```json
{"type": "event", "channel": "terminal-output-session-uuid-123", "payload": "$ ls\n"}
```

All communication over a single WebSocket connection. The `id` field in command calls is echoed in responses for request-response correlation.

### Static File Serving

The server serves the compiled React frontend from a configurable directory:

```
GET /           → index.html
GET /assets/*   → static assets
ws://host/ws    → WebSocket endpoint
```

The frontend detects its transport mode via `VITE_TRANSPORT=websocket` build-time env var, which triggers `getTransport()` to return `WebSocketTransport` instead of `TauriTransport`.

### Authentication

- Static bearer token configured via `CCD_TOKEN` env var or `--token` CLI flag
- Validated on WebSocket upgrade request via query parameter: `?token=SECRET`
- Rejected connections get HTTP 401
- The token is set once at server startup; no user management, no sessions

### Commands Not Available in Web Mode

| Command | Reason | Fallback |
|---------|--------|----------|
| `pick_directory` | Native OS dialog | Frontend shows text input (already done for SSH mode) |
| `launch_claude_code` | Opens local terminal app | Frontend uses embedded terminal/chat |
| `open_folder` | Opens Finder/Explorer | No-op, frontend hides the button |

The `WebSocketTransport` handles these by returning appropriate errors or skipping silently.

### Frontend WebSocketTransport

Implements the `Transport` interface from Step 1:

```typescript
// src/services/transport/websocket.transport.ts
export class WebSocketTransport implements Transport {
  private ws: WebSocket
  private pending = new Map<string, { resolve, reject }>()
  private subscriptions = new Map<string, Set<Function>>()
  private callId = 0

  constructor(url: string) { /* connect, setup onmessage handler */ }

  async call(command, ...args) {
    // Send command, return promise resolved by matching response id
  }

  async subscribe(event, channelId, handler) {
    // Send subscribe message, register handler locally
  }

  destroy() { this.ws.close() }
}
```

### Transport Detection

```typescript
// src/services/transport/index.ts
export function getTransport(): Transport {
  if (!instance) {
    if (import.meta.env.VITE_TRANSPORT === 'websocket') {
      const url = import.meta.env.VITE_WS_URL || `ws://${location.host}/ws`
      const token = import.meta.env.VITE_WS_TOKEN || new URLSearchParams(location.search).get('token') || ''
      instance = new WebSocketTransport(`${url}?token=${token}`)
    } else {
      instance = new TauriTransport()
    }
  }
  return instance
}
```

### Deployment

On the VM:
```bash
# Build frontend for web mode
VITE_TRANSPORT=websocket npm run build

# Build server
cd ccd-server && cargo build --release

# Run
CCD_TOKEN=mysecret ./target/release/ccd-server \
  --port 3100 \
  --static-dir ../dist
```

Behind Caddy:
```
dashboard.example.com {
    reverse_proxy localhost:3100
}
```

### Verification

1. `cargo build` in `src-tauri/` still compiles (Tauri desktop app unchanged)
2. `cargo build` in `ccd-server/` compiles the web server
3. `npm run build` with `VITE_TRANSPORT=websocket` produces a working frontend
4. Start `ccd-server`, open browser, verify:
   - Dashboard loads from static files
   - WebSocket connects with valid token
   - Terminal spawn/write/output streaming works
   - Chat start/send/event streaming works
   - Config read/write works
   - Invalid token gets rejected
5. `npm run build` without env var still produces Tauri-compatible frontend

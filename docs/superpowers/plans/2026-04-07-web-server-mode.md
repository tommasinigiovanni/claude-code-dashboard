# Web Server Mode Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enable the Claude Code Dashboard to run as a standalone web server on a remote VM, accessible from mobile browsers via WebSocket.

**Architecture:** Cargo workspace with 3 crates: `ccd-core` (shared logic, no Tauri deps), `src-tauri` (desktop app, thin Tauri wrappers over core), `ccd-server` (Axum web server with WebSocket). The frontend's existing `Transport` abstraction (from Step 1) gets a `WebSocketTransport` implementation.

**Tech Stack:** Rust (Axum, tokio, portable-pty), TypeScript (existing React frontend), WebSocket JSON-RPC protocol.

**Spec:** `docs/superpowers/specs/2026-04-07-web-server-mode-design.md`

---

## File Structure

### New crate: `ccd-core/`

Pure Rust business logic. Zero Tauri dependencies.

| File | Responsibility |
|------|---------------|
| `ccd-core/Cargo.toml` | Dependencies: portable-pty, tokio, serde, serde_json, uuid, once_cell, dirs, reqwest |
| `ccd-core/src/lib.rs` | Public module declarations |
| `ccd-core/src/events.rs` | `EventEmitter` trait definition |
| `ccd-core/src/types.rs` | Shared data structures (moved from `src-tauri/src/types.rs`) |
| `ccd-core/src/readers.rs` | File I/O utilities (moved from `src-tauri/src/readers.rs`) |
| `ccd-core/src/terminal.rs` | PTY spawn/write/resize, tmux ops (extracted from `src-tauri/src/terminal.rs`) |
| `ccd-core/src/chat.rs` | Chat PTY, ANSI strip, permission detection (extracted from `src-tauri/src/chat.rs`) |
| `ccd-core/src/config.rs` | Config read/write, dashboard data (extracted from `src-tauri/src/config.rs`) |
| `ccd-core/src/ssh.rs` | SSH operations (extracted from `src-tauri/src/ssh.rs`) |
| `ccd-core/src/backup.rs` | Backup CRUD (from `src-tauri/src/backup.rs`) |
| `ccd-core/src/profiles.rs` | Profile CRUD (from `src-tauri/src/profiles.rs`) |
| `ccd-core/src/hooks.rs` | Hooks read/write (from `src-tauri/src/hooks_manager.rs`) |
| `ccd-core/src/launcher.rs` | find_claude_path, check_claude_installed (from `src-tauri/src/launcher.rs`) |
| `ccd-core/src/telegram.rs` | Bot polling/messaging (from `src-tauri/src/telegram.rs`) |
| `ccd-core/src/import_export.rs` | Config import/export (from `src-tauri/src/import_export.rs`) |
| `ccd-core/src/logs.rs` | Session log reading (from `src-tauri/src/logs.rs`) |
| `ccd-core/src/usage.rs` | Usage stats (from `src-tauri/src/usage.rs`) |
| `ccd-core/src/learning.rs` | Memory file reading (from `src-tauri/src/learning.rs`) |
| `ccd-core/src/verification.rs` | Verification runner (from `src-tauri/src/verification.rs`) |

### New crate: `ccd-server/`

Axum web server with WebSocket JSON-RPC.

| File | Responsibility |
|------|---------------|
| `ccd-server/Cargo.toml` | Dependencies: ccd-core, axum, tokio, tower-http, serde_json |
| `ccd-server/src/main.rs` | CLI args (--port, --token, --static-dir), server setup |
| `ccd-server/src/ws.rs` | WebSocket upgrade, JSON-RPC message dispatch to ccd-core |
| `ccd-server/src/emitter.rs` | `WsEmitter` implementing `EventEmitter` via broadcast channel |

### Modified: `src-tauri/`

Becomes thin wrappers over `ccd-core`.

| File | Change |
|------|--------|
| `src-tauri/Cargo.toml` | Add `ccd-core` path dependency |
| `src-tauri/src/lib.rs` | Keep as-is (command registration unchanged) |
| `src-tauri/src/terminal.rs` | Replace logic with calls to `ccd_core::terminal::*` |
| `src-tauri/src/chat.rs` | Replace logic with calls to `ccd_core::chat::*` |
| `src-tauri/src/config.rs` | Replace logic with calls to `ccd_core::config::*` |
| All other `.rs` files | Replace logic with calls to `ccd_core::*` equivalents |

### Modified: Frontend

| File | Change |
|------|--------|
| `src/services/transport/websocket.transport.ts` | Implement `WebSocketTransport` (currently placeholder) |
| `src/services/transport/index.ts` | Add env-based transport detection |

### New: Root workspace

| File | Responsibility |
|------|---------------|
| `Cargo.toml` (root) | Workspace definition: members = ["ccd-core", "ccd-server", "src-tauri"] |

---

## Task 1: Create Cargo Workspace and ccd-core Crate Skeleton

**Files:**
- Create: `Cargo.toml` (root workspace)
- Create: `ccd-core/Cargo.toml`
- Create: `ccd-core/src/lib.rs`
- Create: `ccd-core/src/events.rs`
- Modify: `src-tauri/Cargo.toml`

- [ ] **Step 1: Create root workspace Cargo.toml**

Create `Cargo.toml` at project root:

```toml
[workspace]
members = ["ccd-core", "ccd-server", "src-tauri"]
resolver = "2"
```

- [ ] **Step 2: Create ccd-core/Cargo.toml**

```toml
[package]
name = "ccd-core"
version = "0.1.0"
edition = "2021"

[dependencies]
portable-pty = "0.9.0"
tokio = { version = "1", features = ["full"] }
serde = { version = "1", features = ["derive"] }
serde_json = "1"
uuid = { version = "1.23.0", features = ["v4"] }
once_cell = "1.21.4"
dirs = "5"
reqwest = { version = "0.12", features = ["json", "rustls-tls"], default-features = false }
```

- [ ] **Step 3: Create EventEmitter trait**

Create `ccd-core/src/events.rs`:

```rust
/// Abstraction for emitting events to the frontend.
/// Tauri implements this via AppHandle::emit().
/// The web server implements this via WebSocket broadcast.
pub trait EventEmitter: Send + Sync + 'static {
    fn emit(&self, event_name: &str, payload: String);
}
```

- [ ] **Step 4: Create ccd-core/src/lib.rs**

```rust
pub mod events;
```

- [ ] **Step 5: Add ccd-core dependency to src-tauri**

In `src-tauri/Cargo.toml`, add under `[dependencies]`:

```toml
ccd-core = { path = "../ccd-core" }
```

- [ ] **Step 6: Verify workspace compiles**

Run: `cargo build --workspace`
Expected: All three crates compile (ccd-server doesn't exist yet, but ccd-core and src-tauri should).

Actually, ccd-server isn't created yet, so run:
```bash
cargo build -p ccd-core && cargo build -p claude-code-dashboard
```
Expected: Both compile successfully.

- [ ] **Step 7: Commit**

```bash
git add Cargo.toml ccd-core/ src-tauri/Cargo.toml
git commit -m "feat: create cargo workspace with ccd-core crate and EventEmitter trait"
```

---

## Task 2: Move types.rs and readers.rs to ccd-core

These modules have zero Tauri deps and can move directly.

**Files:**
- Create: `ccd-core/src/types.rs` (copy from `src-tauri/src/types.rs`)
- Create: `ccd-core/src/readers.rs` (copy from `src-tauri/src/readers.rs`)
- Modify: `ccd-core/src/lib.rs`
- Modify: `src-tauri/src/types.rs` (re-export from ccd-core)
- Modify: `src-tauri/src/readers.rs` (re-export from ccd-core)

- [ ] **Step 1: Copy types.rs to ccd-core**

Copy `src-tauri/src/types.rs` to `ccd-core/src/types.rs` unchanged — it only uses `serde` and `std::collections::HashMap`.

- [ ] **Step 2: Copy readers.rs to ccd-core**

Copy `src-tauri/src/readers.rs` to `ccd-core/src/readers.rs`. Replace `use crate::types::*;` with `use crate::types::*;` (same, since it's now in ccd-core).

- [ ] **Step 3: Update ccd-core/src/lib.rs**

```rust
pub mod events;
pub mod types;
pub mod readers;
```

- [ ] **Step 4: Replace src-tauri/src/types.rs with re-export**

```rust
pub use ccd_core::types::*;
```

- [ ] **Step 5: Replace src-tauri/src/readers.rs with re-export**

```rust
pub use ccd_core::readers::*;
```

- [ ] **Step 6: Verify compiles**

Run: `cargo build -p ccd-core && cargo build -p claude-code-dashboard`
Expected: Both compile.

- [ ] **Step 7: Commit**

```bash
git add ccd-core/src/ src-tauri/src/types.rs src-tauri/src/readers.rs
git commit -m "refactor: move types.rs and readers.rs to ccd-core"
```

---

## Task 3: Extract Simple Modules to ccd-core

These modules don't use `AppHandle` or any Tauri-specific features. They only need `#[tauri::command]` removed.

**Modules:** backup, profiles, hooks_manager, import_export, logs, usage, learning, verification, launcher (partial — `find_claude_path` and `check_claude_installed` only)

**Files:**
- Create: `ccd-core/src/backup.rs`, `profiles.rs`, `hooks.rs`, `import_export.rs`, `logs.rs`, `usage.rs`, `learning.rs`, `verification.rs`, `launcher.rs`
- Modify: `ccd-core/src/lib.rs`
- Modify: each corresponding `src-tauri/src/*.rs` to become thin wrappers

- [ ] **Step 1: Extract each module to ccd-core**

For each file, the process is:
1. Copy to `ccd-core/src/`
2. Remove `#[tauri::command]` attributes
3. Remove any `use tauri::*` imports
4. Replace `crate::types::*` with `crate::types::*` (already correct)
5. Make functions `pub`

For example, `ccd-core/src/backup.rs` becomes:

```rust
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct BackupInfo {
    pub filename: String,
    pub timestamp: u64,
    pub size_bytes: u64,
}

pub async fn auto_backup() -> Result<String, String> {
    // ... exact same body as current src-tauri/src/backup.rs ...
}

pub async fn list_backups() -> Result<Vec<BackupInfo>, String> {
    // ... exact same body ...
}

pub async fn restore_backup(filename: String) -> Result<(), String> {
    // ... exact same body ...
}

pub async fn delete_backup(filename: String) -> Result<(), String> {
    // ... exact same body ...
}
```

Apply this pattern to ALL simple modules listed above.

For `launcher.rs`, only extract `find_claude_path()` and `check_claude_installed()` — NOT `open_folder()` or `launch_claude_code()` which use OS-specific features that don't apply in web mode.

- [ ] **Step 2: Update ccd-core/src/lib.rs**

```rust
pub mod events;
pub mod types;
pub mod readers;
pub mod backup;
pub mod profiles;
pub mod hooks;
pub mod import_export;
pub mod logs;
pub mod usage;
pub mod learning;
pub mod verification;
pub mod launcher;
```

- [ ] **Step 3: Replace src-tauri modules with thin wrappers**

Each `src-tauri/src/<module>.rs` becomes a thin wrapper. Example for `backup.rs`:

```rust
#[tauri::command]
pub async fn auto_backup() -> Result<String, String> {
    ccd_core::backup::auto_backup().await
}

#[tauri::command]
pub async fn list_backups() -> Result<Vec<ccd_core::backup::BackupInfo>, String> {
    ccd_core::backup::list_backups().await
}

#[tauri::command]
pub async fn restore_backup(filename: String) -> Result<(), String> {
    ccd_core::backup::restore_backup(filename).await
}

#[tauri::command]
pub async fn delete_backup(filename: String) -> Result<(), String> {
    ccd_core::backup::delete_backup(filename).await
}
```

Apply this pattern to ALL simple modules.

- [ ] **Step 4: Verify compiles**

Run: `cargo build --workspace 2>&1 | head -5` (ccd-server won't exist yet, ignore that error)
Run: `cargo build -p ccd-core && cargo build -p claude-code-dashboard`
Expected: Both compile.

- [ ] **Step 5: Commit**

```bash
git add ccd-core/src/ src-tauri/src/
git commit -m "refactor: extract simple modules to ccd-core"
```

---

## Task 4: Extract ssh.rs and config.rs to ccd-core

These are more complex because `config.rs` depends on `readers.rs` and `ssh.rs` is referenced by `terminal.rs` and `chat.rs`.

**Files:**
- Create: `ccd-core/src/ssh.rs`
- Create: `ccd-core/src/config.rs`
- Modify: `ccd-core/src/lib.rs`
- Modify: `src-tauri/src/ssh.rs` (thin wrapper)
- Modify: `src-tauri/src/config.rs` (thin wrapper)

- [ ] **Step 1: Extract ssh.rs**

Copy `src-tauri/src/ssh.rs` to `ccd-core/src/ssh.rs`. Changes:
- Remove all `#[tauri::command]` attributes
- Remove `use tauri::*` (there is none currently in ssh.rs — it doesn't use AppHandle)
- Make `SshConfig`, `build_ssh_args`, `get_ssh_command`, `escape_shell_path` pub
- Make all command functions pub

- [ ] **Step 2: Extract config.rs**

Copy `src-tauri/src/config.rs` to `ccd-core/src/config.rs`. Changes:
- Remove `#[tauri::command]` attributes
- Replace `use crate::types::*` and `use crate::readers::*` with `use crate::types::*` and `use crate::readers::*` (same paths since they're now in ccd-core)
- Make all functions pub

- [ ] **Step 3: Update lib.rs**

Add `pub mod ssh;` and `pub mod config;` to `ccd-core/src/lib.rs`.

- [ ] **Step 4: Replace src-tauri/src/ssh.rs with thin wrappers**

```rust
pub use ccd_core::ssh::SshConfig;
pub use ccd_core::ssh::get_ssh_command;

#[tauri::command]
pub async fn ssh_test_connection(config: SshConfig) -> Result<String, String> {
    ccd_core::ssh::ssh_test_connection(config).await
}
// ... same pattern for all other ssh commands ...
```

- [ ] **Step 5: Replace src-tauri/src/config.rs with thin wrappers**

Same pattern — each function delegates to `ccd_core::config::*`.

- [ ] **Step 6: Verify compiles**

Run: `cargo build -p ccd-core && cargo build -p claude-code-dashboard`

- [ ] **Step 7: Commit**

```bash
git add ccd-core/src/ src-tauri/src/
git commit -m "refactor: extract ssh.rs and config.rs to ccd-core"
```

---

## Task 5: Extract terminal.rs to ccd-core (EventEmitter)

This is the critical extraction — `terminal_spawn` uses `AppHandle` for event emission.

**Files:**
- Create: `ccd-core/src/terminal.rs`
- Modify: `src-tauri/src/terminal.rs` (thin wrapper with TauriEmitter)

- [ ] **Step 1: Create ccd-core/src/terminal.rs**

Extract from `src-tauri/src/terminal.rs`. Key changes:
- Remove `use tauri::{AppHandle, Emitter};`
- Import `use crate::events::EventEmitter;`
- Remove `#[tauri::command]` from all functions
- Change `terminal_spawn` signature: replace `app: AppHandle` with `emitter: impl EventEmitter`
- In the reader thread, replace `app.emit(&event_name, data)` with `emitter.emit(&event_name, data)`
- Keep `SESSIONS` static and all session management as-is
- Keep `TmuxSession` struct, `sanitize_session_name`, tmux operations unchanged

The `terminal_spawn` function signature becomes:
```rust
pub async fn terminal_spawn(
    emitter: impl EventEmitter,
    project_path: Option<String>,
    use_tmux: Option<bool>,
    tmux_attach_session: Option<String>,
    ssh_config: Option<crate::ssh::SshConfig>,
) -> Result<String, String> {
```

And the reader thread changes from:
```rust
let _ = app.emit(&event_name, data);
```
to:
```rust
emitter.emit(&event_name, data);
```

Note: `emitter` needs to be moved into the thread. Since `EventEmitter: Send + Sync + 'static`, wrap in `Arc` if needed:
```rust
let emitter = std::sync::Arc::new(emitter);
let emitter_clone = emitter.clone();
std::thread::spawn(move || {
    // ... use emitter_clone.emit(...)
});
```

Update `EventEmitter` trait to work with Arc — change `events.rs`:
```rust
pub trait EventEmitter: Send + Sync + 'static {
    fn emit(&self, event_name: &str, payload: String);
}

impl<T: EventEmitter> EventEmitter for std::sync::Arc<T> {
    fn emit(&self, event_name: &str, payload: String) {
        (**self).emit(event_name, payload)
    }
}
```

- [ ] **Step 2: Create TauriEmitter in src-tauri**

In `src-tauri/src/terminal.rs`:

```rust
use tauri::{AppHandle, Emitter};
use ccd_core::events::EventEmitter;

struct TauriEmitter(AppHandle);

impl EventEmitter for TauriEmitter {
    fn emit(&self, event_name: &str, payload: String) {
        let _ = self.0.emit(event_name, payload.clone());
    }
}

#[tauri::command]
pub async fn terminal_spawn(
    app: AppHandle,
    project_path: Option<String>,
    use_tmux: Option<bool>,
    tmux_attach_session: Option<String>,
    ssh_config: Option<crate::ssh::SshConfig>,
) -> Result<String, String> {
    let emitter = TauriEmitter(app);
    ccd_core::terminal::terminal_spawn(emitter, project_path, use_tmux, tmux_attach_session, ssh_config).await
}

#[tauri::command]
pub async fn terminal_write(session_id: String, data: String) -> Result<(), String> {
    ccd_core::terminal::terminal_write(session_id, data).await
}

#[tauri::command]
pub async fn terminal_resize(session_id: String, rows: u16, cols: u16) -> Result<(), String> {
    ccd_core::terminal::terminal_resize(session_id, rows, cols).await
}

pub use ccd_core::terminal::TmuxSession;

#[tauri::command]
pub async fn tmux_list_sessions() -> Result<Vec<TmuxSession>, String> {
    ccd_core::terminal::tmux_list_sessions().await
}

#[tauri::command]
pub async fn tmux_session_cwd(session_name: String) -> Result<Option<String>, String> {
    ccd_core::terminal::tmux_session_cwd(session_name).await
}

#[tauri::command]
pub async fn tmux_kill_session(session_name: String) -> Result<(), String> {
    ccd_core::terminal::tmux_kill_session(session_name).await
}
```

- [ ] **Step 3: Update ccd-core/src/lib.rs**

Add `pub mod terminal;`

- [ ] **Step 4: Verify compiles**

Run: `cargo build -p ccd-core && cargo build -p claude-code-dashboard`

- [ ] **Step 5: Commit**

```bash
git add ccd-core/src/ src-tauri/src/terminal.rs
git commit -m "refactor: extract terminal.rs to ccd-core with EventEmitter trait"
```

---

## Task 6: Extract chat.rs to ccd-core (EventEmitter)

Same pattern as terminal.rs — `chat_start` uses `AppHandle` for event emission.

**Files:**
- Create: `ccd-core/src/chat.rs`
- Modify: `src-tauri/src/chat.rs` (thin wrapper)

- [ ] **Step 1: Create ccd-core/src/chat.rs**

Extract from `src-tauri/src/chat.rs`. Key changes:
- Remove `use tauri::{AppHandle, Emitter};`
- Import `use crate::events::EventEmitter;`
- Remove `#[tauri::command]` from all functions
- Change `chat_start` signature: replace `app: AppHandle` with `emitter: impl EventEmitter`
- The `ChatEvent` needs to be emitted as a JSON string via `EventEmitter`:

```rust
use crate::events::EventEmitter;
use std::sync::Arc;

pub async fn chat_start(
    emitter: impl EventEmitter,
    project_path: Option<String>,
    ssh_config: Option<crate::ssh::SshConfig>,
) -> Result<String, String> {
    // ... same PTY setup ...

    let emitter = Arc::new(emitter);

    // Reader thread:
    let emitter_for_reader = emitter.clone();
    std::thread::spawn(move || {
        // ... instead of app.emit(&event_name, ChatEvent { ... }):
        let event = ChatEvent { session_id: sid.clone(), event_type: "waiting".to_string(), content: String::new() };
        emitter_for_reader.emit(&event_name, serde_json::to_string(&event).unwrap());
        // ... same for all other emits ...
    });
```

Keep `strip_ansi`, `detect_permission_request`, `detect_waiting_for_input` as private functions in `ccd-core/src/chat.rs`.

`chat_send`, `chat_approve`, `save_temp_image` don't use AppHandle — extract directly.

- [ ] **Step 2: Update src-tauri/src/chat.rs to be thin wrapper**

Same pattern as terminal.rs — use `TauriEmitter` for `chat_start`, delegate everything else directly.

Note: The Tauri `TauriEmitter` for chat needs to deserialize the JSON string back to `ChatEvent` before calling `app.emit()`, since Tauri's emit expects a serializable payload, not a string. Create a helper:

```rust
struct TauriEmitter(AppHandle);

impl EventEmitter for TauriEmitter {
    fn emit(&self, event_name: &str, payload: String) {
        // Try to deserialize as ChatEvent for structured emit, fallback to string
        if let Ok(chat_event) = serde_json::from_str::<ccd_core::chat::ChatEvent>(&payload) {
            let _ = self.0.emit(event_name, chat_event);
        } else {
            let _ = self.0.emit(event_name, payload);
        }
    }
}
```

- [ ] **Step 3: Update ccd-core/src/lib.rs**

Add `pub mod chat;`

- [ ] **Step 4: Verify compiles**

Run: `cargo build -p ccd-core && cargo build -p claude-code-dashboard`

- [ ] **Step 5: Commit**

```bash
git add ccd-core/src/chat.rs src-tauri/src/chat.rs
git commit -m "refactor: extract chat.rs to ccd-core with EventEmitter trait"
```

---

## Task 7: Extract telegram.rs to ccd-core

Telegram bot uses `AppHandle` for its own PTY event emission. Needs the same `EventEmitter` treatment.

**Files:**
- Create: `ccd-core/src/telegram.rs`
- Modify: `src-tauri/src/telegram.rs` (thin wrapper)

- [ ] **Step 1: Extract telegram.rs**

Copy `src-tauri/src/telegram.rs` to `ccd-core/src/telegram.rs`. Changes:
- Remove `use tauri::{AppHandle, Emitter};`
- Replace `app: AppHandle` parameter in `telegram_start_bot` with `emitter: impl EventEmitter`
- The Telegram bot spawns Claude PTY sessions internally — route those through the same `EventEmitter`
- `telegram_bot_status` and `telegram_stop_bot` don't use AppHandle — extract directly

- [ ] **Step 2: Update src-tauri/src/telegram.rs**

Thin wrapper using `TauriEmitter`.

- [ ] **Step 3: Update lib.rs, verify, commit**

Add `pub mod telegram;` to ccd-core lib.rs.

```bash
cargo build -p ccd-core && cargo build -p claude-code-dashboard
git add ccd-core/src/ src-tauri/src/telegram.rs
git commit -m "refactor: extract telegram.rs to ccd-core"
```

---

## Task 8: Verify Tauri Desktop App Still Works

**Files:** None (verification only)

- [ ] **Step 1: Full workspace build**

```bash
cargo build -p ccd-core && cargo build -p claude-code-dashboard
```
Expected: Compiles cleanly.

- [ ] **Step 2: Frontend build**

```bash
npm run build
```
Expected: Vite build succeeds.

- [ ] **Step 3: Run Tauri dev mode**

```bash
npm run tauri dev
```
Expected: Desktop app launches, all features work as before. Test:
- Dashboard loads with config
- Terminal embed works
- Settings page renders

- [ ] **Step 4: Commit (if any fixes needed)**

---

## Task 9: Create ccd-server Crate with Axum

**Files:**
- Create: `ccd-server/Cargo.toml`
- Create: `ccd-server/src/main.rs`
- Create: `ccd-server/src/emitter.rs`
- Create: `ccd-server/src/ws.rs`

- [ ] **Step 1: Create ccd-server/Cargo.toml**

```toml
[package]
name = "ccd-server"
version = "0.1.0"
edition = "2021"

[dependencies]
ccd-core = { path = "../ccd-core" }
axum = { version = "0.8", features = ["ws"] }
tokio = { version = "1", features = ["full"] }
tower-http = { version = "0.6", features = ["fs", "cors"] }
serde = { version = "1", features = ["derive"] }
serde_json = "1"
uuid = { version = "1", features = ["v4"] }
clap = { version = "4", features = ["derive"] }
```

- [ ] **Step 2: Create WsEmitter**

Create `ccd-server/src/emitter.rs`:

```rust
use ccd_core::events::EventEmitter;
use tokio::sync::broadcast;

#[derive(Clone)]
pub struct WsMessage {
    pub channel: String,
    pub payload: String,
}

#[derive(Clone)]
pub struct WsEmitter {
    tx: broadcast::Sender<WsMessage>,
}

impl WsEmitter {
    pub fn new(tx: broadcast::Sender<WsMessage>) -> Self {
        Self { tx }
    }
}

impl EventEmitter for WsEmitter {
    fn emit(&self, event_name: &str, payload: String) {
        let _ = self.tx.send(WsMessage {
            channel: event_name.to_string(),
            payload,
        });
    }
}
```

- [ ] **Step 3: Create WebSocket handler**

Create `ccd-server/src/ws.rs`:

```rust
use axum::extract::ws::{Message, WebSocket};
use serde::{Deserialize, Serialize};
use std::collections::HashSet;
use std::sync::Arc;
use tokio::sync::{broadcast, Mutex};

use crate::emitter::{WsEmitter, WsMessage};

#[derive(Deserialize)]
#[serde(untagged)]
enum IncomingMessage {
    Call { id: String, command: String, params: serde_json::Value },
    Subscribe { r#type: String, channel: String },
}

#[derive(Serialize)]
struct CallResponse {
    id: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    result: Option<serde_json::Value>,
    #[serde(skip_serializing_if = "Option::is_none")]
    error: Option<String>,
}

#[derive(Serialize)]
struct EventPush {
    r#type: String,
    channel: String,
    payload: String,
}

pub async fn handle_socket(
    mut socket: WebSocket,
    tx: broadcast::Sender<WsMessage>,
) {
    let subscriptions = Arc::new(Mutex::new(HashSet::<String>::new()));
    let mut rx = tx.subscribe();

    // Spawn task to forward events to this client
    let subs_clone = subscriptions.clone();
    let (mut ws_tx, mut ws_rx) = socket.into_parts();

    // ... implementation for reading incoming messages, dispatching commands,
    // and forwarding subscribed events — see Task 10 for the dispatch logic
}
```

- [ ] **Step 4: Create main.rs**

Create `ccd-server/src/main.rs`:

```rust
mod emitter;
mod ws;

use axum::{
    extract::{Query, WebSocketUpgrade},
    http::StatusCode,
    response::IntoResponse,
    routing::get,
    Router,
};
use clap::Parser;
use std::net::SocketAddr;
use std::sync::Arc;
use tokio::sync::broadcast;
use tower_http::services::ServeDir;

#[derive(Parser)]
#[command(name = "ccd-server", about = "Claude Code Dashboard Web Server")]
struct Args {
    #[arg(long, default_value = "3100")]
    port: u16,

    #[arg(long, env = "CCD_TOKEN")]
    token: String,

    #[arg(long, default_value = "../dist")]
    static_dir: String,
}

#[derive(serde::Deserialize)]
struct WsQuery {
    token: String,
}

struct AppState {
    token: String,
    tx: broadcast::Sender<emitter::WsMessage>,
}

async fn ws_handler(
    ws: WebSocketUpgrade,
    Query(query): Query<WsQuery>,
    state: Arc<AppState>,
) -> impl IntoResponse {
    if query.token != state.token {
        return StatusCode::UNAUTHORIZED.into_response();
    }
    ws.on_upgrade(move |socket| ws::handle_socket(socket, state.tx.clone()))
        .into_response()
}

#[tokio::main]
async fn main() {
    let args = Args::parse();
    let (tx, _) = broadcast::channel::<emitter::WsMessage>(1024);

    let state = Arc::new(AppState {
        token: args.token.clone(),
        tx,
    });

    let app = Router::new()
        .route("/ws", get({
            let state = state.clone();
            move |ws, query| ws_handler(ws, query, state)
        }))
        .fallback_service(ServeDir::new(&args.static_dir));

    let addr = SocketAddr::from(([0, 0, 0, 0], args.port));
    println!("ccd-server listening on http://{}", addr);

    let listener = tokio::net::TcpListener::bind(addr).await.unwrap();
    axum::serve(listener, app).await.unwrap();
}
```

- [ ] **Step 5: Verify ccd-server compiles**

Run: `cargo build -p ccd-server`
Expected: Compiles (WebSocket handler is incomplete but structurally valid).

- [ ] **Step 6: Commit**

```bash
git add ccd-server/
git commit -m "feat: create ccd-server crate with Axum, WebSocket, and static file serving"
```

---

## Task 10: Implement WebSocket Command Dispatch

Wire up the JSON-RPC dispatch in `ws.rs` — routing incoming command names to `ccd_core::*` functions.

**Files:**
- Modify: `ccd-server/src/ws.rs`

- [ ] **Step 1: Implement full dispatch**

The `handle_socket` function needs to:
1. Read incoming JSON messages
2. Parse as `Call` or `Subscribe/Unsubscribe`
3. For calls: match `command` string → call the appropriate `ccd_core::*` function → send response
4. For subscriptions: add/remove channel from the client's subscription set
5. Forward matching events from the broadcast channel

The dispatch macro to avoid boilerplate:

```rust
macro_rules! dispatch {
    ($id:expr, $params:expr, $cmd:expr, {
        $( $name:literal => $func:expr ),* $(,)?
    }) => {
        match $cmd.as_str() {
            $(
                $name => {
                    match serde_json::from_value($params.clone()) {
                        Ok(args) => {
                            let result = $func(args).await;
                            match result {
                                Ok(val) => CallResponse {
                                    id: $id,
                                    result: Some(serde_json::to_value(val).unwrap_or_default()),
                                    error: None,
                                },
                                Err(e) => CallResponse { id: $id, result: None, error: Some(e) },
                            }
                        }
                        Err(e) => CallResponse { id: $id, result: None, error: Some(format!("Invalid params: {}", e)) },
                    }
                }
            )*
            _ => CallResponse { id: $id, result: None, error: Some(format!("Unknown command: {}", $cmd)) },
        }
    };
}
```

Then create individual handler functions that unwrap the JSON params and call ccd-core. For example:

```rust
async fn handle_command(
    command: &str,
    params: serde_json::Value,
    emitter: &WsEmitter,
) -> Result<serde_json::Value, String> {
    match command {
        // Config
        "read_config" => {
            let scope: String = params.get("scope").and_then(|v| v.as_str()).unwrap_or("global").to_string();
            let project_path = params.get("projectPath").and_then(|v| v.as_str()).map(|s| s.to_string());
            let result = ccd_core::config::read_config(scope, project_path).await?;
            Ok(serde_json::to_value(result).unwrap())
        }
        "read_dashboard_data" => {
            let result = ccd_core::config::read_dashboard_data().await?;
            Ok(serde_json::to_value(result).unwrap())
        }
        // Terminal
        "terminal_spawn" => {
            let project_path = params.get("projectPath").and_then(|v| v.as_str()).map(|s| s.to_string());
            let use_tmux = params.get("useTmux").and_then(|v| v.as_bool());
            let tmux_attach = params.get("tmuxAttachSession").and_then(|v| v.as_str()).map(|s| s.to_string());
            let ssh_config: Option<ccd_core::ssh::SshConfig> = params.get("sshConfig").and_then(|v| serde_json::from_value(v.clone()).ok());
            let result = ccd_core::terminal::terminal_spawn(emitter.clone(), project_path, use_tmux, tmux_attach, ssh_config).await?;
            Ok(serde_json::to_value(result).unwrap())
        }
        "terminal_write" => {
            let session_id = params.get("sessionId").and_then(|v| v.as_str()).ok_or("Missing sessionId")?.to_string();
            let data = params.get("data").and_then(|v| v.as_str()).ok_or("Missing data")?.to_string();
            ccd_core::terminal::terminal_write(session_id, data).await?;
            Ok(serde_json::Value::Null)
        }
        "terminal_resize" => {
            let session_id = params.get("sessionId").and_then(|v| v.as_str()).ok_or("Missing sessionId")?.to_string();
            let rows = params.get("rows").and_then(|v| v.as_u64()).ok_or("Missing rows")? as u16;
            let cols = params.get("cols").and_then(|v| v.as_u64()).ok_or("Missing cols")? as u16;
            ccd_core::terminal::terminal_resize(session_id, rows, cols).await?;
            Ok(serde_json::Value::Null)
        }
        // ... all other commands following the same pattern ...
        // Chat
        "chat_start" => {
            let project_path = params.get("projectPath").and_then(|v| v.as_str()).map(|s| s.to_string());
            let ssh_config: Option<ccd_core::ssh::SshConfig> = params.get("sshConfig").and_then(|v| serde_json::from_value(v.clone()).ok());
            let result = ccd_core::chat::chat_start(emitter.clone(), project_path, ssh_config).await?;
            Ok(serde_json::to_value(result).unwrap())
        }
        "chat_send" | "chat_approve" | "save_temp_image" |
        "write_config" | "read_project_extras" |
        "tmux_list_sessions" | "tmux_kill_session" | "tmux_session_cwd" |
        "auto_backup" | "list_backups" | "restore_backup" | "delete_backup" |
        "list_profiles" | "save_profile" | "load_profile" | "delete_profile" |
        "read_hooks" | "write_hooks" |
        "read_agent_file" | "write_agent_file" | "delete_agent_file" |
        "toggle_plugin" | "health_check_mcp" |
        "export_config" | "import_config" |
        "check_claude_installed" | "get_claude_home" |
        "read_session_logs" | "read_usage_stats" | "read_memories" | "run_verification" |
        "telegram_bot_status" | "telegram_start_bot" | "telegram_stop_bot" |
        "ssh_test_connection" | "ssh_read_dashboard_data" | "ssh_health_check_mcp" |
        "ssh_tmux_list_sessions" | "ssh_tmux_kill_session" |
        "ssh_read_config" | "ssh_write_config" => {
            // Each of these needs its own param extraction + ccd_core call
            // Implement them following the same pattern as above
            Err(format!("Command '{}' not yet implemented", command))
        }
        // Desktop-only commands
        "pick_directory" => Err("pick_directory is not available in web mode".to_string()),
        "launch_claude_code" => Err("launch_claude_code is not available in web mode".to_string()),
        "open_folder" => Err("open_folder is not available in web mode".to_string()),
        _ => Err(format!("Unknown command: {}", command)),
    }
}
```

Implement ALL the remaining command handlers following the pattern. Each one extracts params from JSON and calls the corresponding `ccd_core::` function.

- [ ] **Step 2: Implement WebSocket message loop**

Complete the `handle_socket` function:

```rust
pub async fn handle_socket(
    socket: WebSocket,
    tx: broadcast::Sender<WsMessage>,
) {
    let (mut sender, mut receiver) = socket.split();
    let subscriptions = Arc::new(Mutex::new(HashSet::<String>::new()));
    let mut rx = tx.subscribe();
    let emitter = WsEmitter::new(tx);

    // Task 1: Forward subscribed events to client
    let subs_for_events = subscriptions.clone();
    let mut send_task = tokio::spawn(async move {
        while let Ok(msg) = rx.recv().await {
            let subs = subs_for_events.lock().await;
            if subs.contains(&msg.channel) {
                let push = EventPush {
                    r#type: "event".to_string(),
                    channel: msg.channel,
                    payload: msg.payload,
                };
                if sender.send(Message::Text(serde_json::to_string(&push).unwrap().into())).await.is_err() {
                    break;
                }
            }
        }
    });

    // Task 2: Process incoming messages
    let subs_for_cmds = subscriptions.clone();
    let mut recv_task = tokio::spawn(async move {
        while let Some(Ok(msg)) = receiver.next().await {
            if let Message::Text(text) = msg {
                let text = text.to_string();
                if let Ok(incoming) = serde_json::from_str::<serde_json::Value>(&text) {
                    if let Some(msg_type) = incoming.get("type").and_then(|v| v.as_str()) {
                        match msg_type {
                            "subscribe" => {
                                if let Some(ch) = incoming.get("channel").and_then(|v| v.as_str()) {
                                    subs_for_cmds.lock().await.insert(ch.to_string());
                                }
                            }
                            "unsubscribe" => {
                                if let Some(ch) = incoming.get("channel").and_then(|v| v.as_str()) {
                                    subs_for_cmds.lock().await.remove(ch);
                                }
                            }
                            _ => {}
                        }
                    } else if let (Some(id), Some(command)) = (
                        incoming.get("id").and_then(|v| v.as_str()),
                        incoming.get("command").and_then(|v| v.as_str()),
                    ) {
                        let params = incoming.get("params").cloned().unwrap_or(serde_json::Value::Null);
                        let response = handle_command(command, params, &emitter).await;
                        let resp = match response {
                            Ok(val) => CallResponse { id: id.to_string(), result: Some(val), error: None },
                            Err(e) => CallResponse { id: id.to_string(), result: None, error: Some(e) },
                        };
                        // Send response back (need sender reference — restructure with channels)
                    }
                }
            }
        }
    });

    tokio::select! {
        _ = &mut send_task => recv_task.abort(),
        _ = &mut recv_task => send_task.abort(),
    }
}
```

Note: The actual implementation needs a channel to send responses back from the recv_task to the send_task, since `sender` is moved. Use a `tokio::sync::mpsc` channel for outgoing messages.

- [ ] **Step 3: Verify compiles**

Run: `cargo build -p ccd-server`

- [ ] **Step 4: Commit**

```bash
git add ccd-server/src/
git commit -m "feat: implement WebSocket JSON-RPC command dispatch in ccd-server"
```

---

## Task 11: Implement WebSocketTransport in Frontend

**Files:**
- Create: `src/services/transport/websocket.transport.ts`
- Modify: `src/services/transport/index.ts`

- [ ] **Step 1: Create WebSocketTransport**

Create `src/services/transport/websocket.transport.ts`:

```typescript
import type {
  Transport,
  CommandName,
  CommandParams,
  CommandResult,
  EventName,
  EventMap,
  EventSubscription,
} from './types'

interface PendingCall {
  resolve: (value: unknown) => void
  reject: (reason: string) => void
}

export class WebSocketTransport implements Transport {
  private ws: WebSocket
  private pending = new Map<string, PendingCall>()
  private eventHandlers = new Map<string, Set<(payload: unknown) => void>>()
  private callId = 0
  private ready: Promise<void>

  constructor(url: string) {
    this.ws = new WebSocket(url)
    this.ready = new Promise((resolve, reject) => {
      this.ws.onopen = () => resolve()
      this.ws.onerror = () => reject(new Error('WebSocket connection failed'))
    })

    this.ws.onmessage = (event) => {
      const msg = JSON.parse(event.data)

      // Command response
      if (msg.id !== undefined) {
        const pending = this.pending.get(msg.id)
        if (pending) {
          if (msg.error) {
            pending.reject(msg.error)
          } else {
            pending.resolve(msg.result)
          }
          this.pending.delete(msg.id)
        }
        return
      }

      // Event push
      if (msg.type === 'event') {
        const handlers = this.eventHandlers.get(msg.channel)
        if (handlers) {
          // Parse payload: try JSON first, fallback to raw string
          let payload: unknown
          try {
            payload = JSON.parse(msg.payload)
          } catch {
            payload = msg.payload
          }
          handlers.forEach((h) => h(payload))
        }
      }
    }

    this.ws.onclose = () => {
      // Reject all pending calls
      for (const [, pending] of this.pending) {
        pending.reject('WebSocket closed')
      }
      this.pending.clear()
    }
  }

  async call<C extends CommandName>(
    command: C,
    ...args: CommandParams<C> extends void ? [] : [CommandParams<C>]
  ): Promise<CommandResult<C>> {
    await this.ready
    const id = String(++this.callId)
    const params = args[0] ?? {}

    return new Promise<CommandResult<C>>((resolve, reject) => {
      this.pending.set(id, {
        resolve: resolve as (value: unknown) => void,
        reject,
      })
      this.ws.send(JSON.stringify({ id, command, params }))
    })
  }

  async subscribe<E extends EventName>(
    event: E,
    channelId: string,
    handler: (payload: EventMap[E]) => void,
  ): Promise<EventSubscription> {
    await this.ready
    const channel = `${event}-${channelId}`

    if (!this.eventHandlers.has(channel)) {
      this.eventHandlers.set(channel, new Set())
      this.ws.send(JSON.stringify({ type: 'subscribe', channel }))
    }

    const handlers = this.eventHandlers.get(channel)!
    const wrappedHandler = handler as (payload: unknown) => void
    handlers.add(wrappedHandler)

    return {
      unsubscribe: () => {
        handlers.delete(wrappedHandler)
        if (handlers.size === 0) {
          this.ws.send(JSON.stringify({ type: 'unsubscribe', channel }))
          this.eventHandlers.delete(channel)
        }
      },
    }
  }

  destroy(): void {
    this.ws.close()
    this.pending.clear()
    this.eventHandlers.clear()
  }
}
```

- [ ] **Step 2: Update transport factory**

Edit `src/services/transport/index.ts`:

```typescript
import type { Transport } from './types'
import { TauriTransport } from './tauri.transport'
import { WebSocketTransport } from './websocket.transport'

let instance: Transport | null = null

export function getTransport(): Transport {
  if (!instance) {
    if (import.meta.env.VITE_TRANSPORT === 'websocket') {
      const wsUrl = import.meta.env.VITE_WS_URL
        || `${location.protocol === 'https:' ? 'wss:' : 'ws:'}//${location.host}/ws`
      const token = new URLSearchParams(location.search).get('token') || ''
      instance = new WebSocketTransport(`${wsUrl}?token=${token}`)
    } else {
      instance = new TauriTransport()
    }
  }
  return instance
}

// ... keep existing type re-exports ...
```

- [ ] **Step 3: Verify frontend compiles**

Run: `npm run build`
Expected: Compiles (WebSocketTransport is valid TypeScript).

- [ ] **Step 4: Commit**

```bash
git add src/services/transport/
git commit -m "feat: implement WebSocketTransport for web server mode"
```

---

## Task 12: End-to-End Verification

**Files:** None (verification only)

- [ ] **Step 1: Build frontend for web mode**

```bash
VITE_TRANSPORT=websocket npm run build
```
Expected: Produces `dist/` with the web-mode frontend.

- [ ] **Step 2: Build ccd-server**

```bash
cargo build -p ccd-server --release
```
Expected: Produces `target/release/ccd-server`.

- [ ] **Step 3: Start server**

```bash
CCD_TOKEN=test123 ./target/release/ccd-server --port 3100 --static-dir dist
```
Expected: "ccd-server listening on http://0.0.0.0:3100"

- [ ] **Step 4: Test in browser**

Open: `http://localhost:3100/?token=test123`
Expected: Dashboard loads from static files.

Verify:
- WebSocket connects (check browser DevTools Network tab)
- Dashboard data loads (config page shows MCP servers)
- Terminal spawn works (embedded terminal streams output)
- Chat works (send message, receive response)
- Invalid token gets rejected (try `?token=wrong`)

- [ ] **Step 5: Verify Tauri desktop still works**

```bash
npm run build  # without VITE_TRANSPORT
npm run tauri dev
```
Expected: Desktop app works as before.

- [ ] **Step 6: Commit any fixes**

```bash
git add -A
git commit -m "fix: end-to-end verification fixes for web server mode"
```

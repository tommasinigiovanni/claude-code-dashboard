# Claude Code Dashboard — Web Server Mode

Run the Claude Code Dashboard as a standalone web server, accessible from any browser (including mobile).

## Prerequisites

- **Rust toolchain** (1.75+): `curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh`
- **Node.js** (20+): for building the frontend
- **Claude Code** installed: `npm install -g @anthropic-ai/claude-code`

## Quick Start

```bash
# 1. Install frontend dependencies
npm install

# 2. Build the frontend for web mode
VITE_TRANSPORT=websocket npm run build

# 3. Build the server
cargo build -p ccd-server --release

# 4. Run
CCD_TOKEN=your_secret_token ./target/release/ccd-server
```

Open `http://localhost:3100/?token=your_secret_token` in your browser.

## CLI Options

```
ccd-server [OPTIONS] --token <TOKEN>

Options:
  --port <PORT>              Port to listen on [default: 3100]
  --token <TOKEN>            Authentication token [env: CCD_TOKEN]
  --bot-token <TOKEN>        Telegram bot token for Mini App auth [env: CCD_BOT_TOKEN]
  --static-dir <STATIC_DIR>  Directory with compiled frontend [default: ../dist]
```

The token can be passed as a CLI flag or via the `CCD_TOKEN` environment variable.
The bot token is optional — only needed if you want Telegram Mini App authentication.

## Authentication

The server requires a static token for all WebSocket connections. The token is validated on the initial WebSocket upgrade request via query parameter:

```
ws://host:3100/ws?token=your_secret_token
```

The frontend reads the token from the URL query string automatically. When you open the dashboard at `http://host:3100/?token=xyz`, the frontend extracts the token and uses it for the WebSocket connection.

Requests with an invalid or missing token receive HTTP 401 Unauthorized.

## Telegram Mini App (optional)

You can open the dashboard directly inside Telegram as a Mini App. Authentication is automatic via Telegram's `initData` — no token needed.

### Setup

1. Start the server with your Telegram bot token:
   ```bash
   CCD_TOKEN=your_token CCD_BOT_TOKEN=your_bot_token ./target/release/ccd-server --port 3100 --static-dir dist
   ```

2. Configure the Menu Button via BotFather:
   - Open @BotFather in Telegram
   - Send `/mybots` > select your bot > Bot Settings > Menu Button
   - Set the URL to your dashboard (e.g., `https://dashboard.yourdomain.com/`)

3. Open your bot in Telegram and tap the "Dashboard" menu button. The dashboard opens in Telegram's WebView with automatic authentication.

The bot also shows an "Open Dashboard" inline button when you send `/start` or `/menu`.

### How it works

- Telegram injects `initData` (cryptographically signed user data) into the WebView
- The frontend detects Telegram and sends `initData` to `POST /tg-auth`
- The server validates the HMAC-SHA256 signature using the bot token
- On success, a session token is returned and used for the WebSocket connection
- Sessions expire after 24 hours

Browser access with the static token continues to work alongside Telegram auth.

## PWA (Add to Home Screen)

The dashboard can be installed as a PWA on mobile devices:

- **Android Chrome**: tap the menu (3 dots) > "Install app" or "Add to Home Screen"
- **iOS Safari**: tap Share > "Add to Home Screen"

The app opens in standalone mode (no browser chrome). The auth token is persisted in localStorage — you only need to enter it once.

## Production Deployment (VM)

### 1. Clone and build on the VM

```bash
git clone https://github.com/tommasinigiovanni/claude-code-dashboard.git
cd claude-code-dashboard

npm install
VITE_TRANSPORT=websocket npm run build
cargo build -p ccd-server --release
```

### 2. Run as a systemd service

Create `/etc/systemd/system/ccd-server.service`:

```ini
[Unit]
Description=Claude Code Dashboard Web Server
After=network.target

[Service]
Type=simple
User=your_user
WorkingDirectory=/path/to/claude-code-dashboard
Environment=CCD_TOKEN=your_secret_token_here
Environment=CCD_BOT_TOKEN=your_telegram_bot_token
ExecStart=/path/to/claude-code-dashboard/target/release/ccd-server --static-dir /path/to/claude-code-dashboard/dist
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable ccd-server
sudo systemctl start ccd-server
```

### 3. HTTPS with Caddy (recommended)

Install Caddy: `sudo apt install caddy`

Edit `/etc/caddy/Caddyfile`:

```
dashboard.yourdomain.com {
    reverse_proxy localhost:3100
}
```

```bash
sudo systemctl restart caddy
```

Caddy handles HTTPS certificates automatically via Let's Encrypt.

Access: `https://dashboard.yourdomain.com/?token=your_secret_token`

### 4. HTTPS with Nginx (alternative)

```nginx
server {
    listen 443 ssl;
    server_name dashboard.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/dashboard.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/dashboard.yourdomain.com/privkey.pem;

    location / {
        proxy_pass http://127.0.0.1:3100;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_read_timeout 86400;
    }
}
```

The `proxy_set_header Upgrade` and `Connection "upgrade"` directives are required for WebSocket support.

## Architecture

```
Browser (phone/desktop)
  |
  |  HTTPS
  v
Caddy / Nginx  (reverse proxy, TLS termination)
  |
  |  HTTP + WebSocket
  v
ccd-server  (Axum, port 3100)
  |
  +-- GET /           -> serves dist/index.html
  +-- GET /assets/*   -> serves static files
  +-- POST /tg-auth   -> Telegram initData validation
  +-- WS  /ws?token=  -> WebSocket JSON-RPC (also accepts ?tg_session=)
        |
        v
      ccd-core  (shared business logic)
        |
        +-- PTY sessions (terminal, chat)
        +-- Config I/O (~/.claude/settings.json)
        +-- SSH operations
        +-- Telegram bot
        +-- Backup, profiles, hooks, etc.
```

The frontend communicates with the backend entirely through a single WebSocket connection using a JSON-RPC-like protocol. All commands that work in the desktop Tauri app also work in web mode, except:

| Command | Web mode behavior |
|---------|------------------|
| `pick_directory` | Returns error (use text input instead) |
| `launch_claude_code` | Returns error (use embedded terminal) |
| `open_folder` | Returns error (no-op) |

## Troubleshooting

**Server won't start — "address already in use"**
Another process is using port 3100. Use `--port 3101` or stop the other process.

**WebSocket connection fails**
Check that your reverse proxy forwards WebSocket upgrade headers. See the Nginx config above for the required headers.

**Dashboard loads but shows errors**
Check that Claude Code is installed on the server: `claude --version`. The dashboard calls Claude Code locally on the machine where the server runs.

**Token in URL is visible**
The token is in the URL query string for simplicity. For better security, bookmark the URL with the token, or use a password manager. The token is only sent over HTTPS (encrypted).

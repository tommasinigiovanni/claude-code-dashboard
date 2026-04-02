# ARCHITECTURE — Claude Code Dashboard

> Versione 0.1 — Documento di architettura tecnica

---

## 1. Stack tecnologico

| Layer | Tecnologia | Motivazione |
|---|---|---|
| Framework desktop | **Tauri 2** | Cross-platform, installer leggero (~15MB), tray icon nativa |
| Frontend | **React 18 + TypeScript** | Ecosistema ampio, tipizzazione robusta |
| UI Components | **shadcn/ui** | Design moderno, accessibile, dark mode nativa |
| Styling | **Tailwind CSS v4** | Utility-first, coerenza visiva |
| State management | **Zustand** | Leggero, semplice, adatto a questo scope |
| Backend/OS layer | **Rust (Tauri core)** | Accesso filesystem, spawn processi, sicurezza |
| Build tool | **Vite** | Dev server veloce, ottima integrazione Tauri |

---

## 2. Struttura cartelle

```
claude-code-dashboard/
├── src/                          # Frontend React
│   ├── components/
│   │   ├── ui/                   # shadcn/ui components (auto-generati)
│   │   ├── layout/
│   │   │   ├── Sidebar.tsx
│   │   │   ├── TopBar.tsx
│   │   │   └── ContextSwitcher.tsx
│   │   ├── mcp/
│   │   │   ├── McpList.tsx
│   │   │   ├── McpCard.tsx
│   │   │   └── McpForm.tsx
│   │   ├── skills/
│   │   │   ├── SkillsList.tsx
│   │   │   └── SkillCard.tsx
│   │   ├── subagents/
│   │   │   ├── SubagentList.tsx
│   │   │   ├── SubagentCard.tsx
│   │   │   └── SubagentForm.tsx
│   │   └── launcher/
│   │       └── QuickLauncher.tsx
│   ├── pages/
│   │   ├── McpPage.tsx
│   │   ├── SkillsPage.tsx
│   │   ├── SubagentsPage.tsx
│   │   └── LauncherPage.tsx
│   ├── store/
│   │   ├── configStore.ts        # Stato configurazione (global/project)
│   │   └── uiStore.ts            # Stato UI (tab attiva, modal aperti)
│   ├── hooks/
│   │   ├── useConfig.ts          # Hook per leggere/scrivere config
│   │   └── useClaudeCode.ts      # Hook per interagire con Claude Code
│   ├── types/
│   │   └── claude.ts             # Tipi TypeScript per claude.json
│   ├── lib/
│   │   └── utils.ts              # Utility condivise
│   └── App.tsx
│
├── src-tauri/                    # Backend Rust
│   ├── src/
│   │   ├── main.rs
│   │   ├── config.rs             # Lettura/scrittura claude.json
│   │   ├── launcher.rs           # Spawn processo Claude Code
│   │   └── tray.rs               # System tray icon
│   ├── Cargo.toml
│   └── tauri.conf.json
│
├── public/
├── package.json
├── tsconfig.json
├── tailwind.config.ts
└── vite.config.ts
```

---

## 3. Flusso dati

```
Frontend (React)
     │
     │  invoke("read_config", { scope: "global" | "project", path? })
     ▼
Tauri Command (Rust)
     │
     │  fs::read_to_string("~/.claude/claude.json")
     │  o
     │  fs::read_to_string("{project_path}/.claude/claude.json")
     ▼
JSON parsed → ClaudeConfig struct
     │
     │  serializzato e ritornato al frontend
     ▼
Zustand store (configStore)
     │
     │  componenti React leggono dallo store
     ▼
UI renderizzata
```

**Scrittura (modifica config):**
```
User action (toggle MCP, add sub-agent, ecc.)
     │
     ▼
Zustand store aggiornato ottimisticamente
     │
     ▼
invoke("write_config", { scope, path?, config })
     │
     ▼
Rust: serializza JSON → fs::write
     │
     ▼
Conferma → store sincronizzato
```

---

## 4. Tauri Commands esposti

```rust
// Lettura configurazione
#[tauri::command]
async fn read_config(scope: String, project_path: Option<String>) -> Result<ClaudeConfig, String>

// Scrittura configurazione
#[tauri::command]
async fn write_config(scope: String, project_path: Option<String>, config: ClaudeConfig) -> Result<(), String>

// Avvio Claude Code
#[tauri::command]
async fn launch_claude_code(project_path: Option<String>) -> Result<(), String>

// Selezione cartella (dialog nativo)
#[tauri::command]
async fn pick_directory() -> Result<Option<String>, String>

// Verifica se Claude Code è installato
#[tauri::command]
async fn check_claude_installed() -> Result<bool, String>

// Apri cartella nel file explorer nativo
#[tauri::command]
async fn open_folder(path: String) -> Result<(), String>
```

---

## 5. Gestione contesto Global / Project

La dashboard mantiene un **contesto attivo** nello store Zustand:

```typescript
type ConfigScope = {
  mode: 'global' | 'project'
  projectPath?: string  // solo in modalità project
}
```

- In modalità **global**: tutti i Tauri commands leggono/scrivono `~/.claude/claude.json`
- In modalità **project**: leggono/scrivono `{projectPath}/.claude/claude.json`
- L'ereditarietà è calcolata sul frontend: si leggono entrambi i file e si fa merge, segnando ogni item con `source: 'global' | 'local'`

---

## 6. System tray

L'app gira come **tray icon** in background una volta avviata. Comportamento:
- Click sull'icona → porta in primo piano la finestra
- Menu tray: `Apri dashboard`, `Avvia Claude Code`, `Esci`
- All'avvio del sistema (opzionale, configurabile): l'app si avvia minimizzata nel tray

---

## 7. Distribuzione

| Piattaforma | Formato |
|---|---|
| macOS | `.dmg` |
| Windows | `.msi` o `.exe` NSIS |
| Linux | `.AppImage` o `.deb` |

Build automatizzata tramite **GitHub Actions** con `tauri-action`. Nessuna dipendenza esterna richiesta dall'utente finale.

---

## 8. Prerequisiti sviluppo

```bash
# Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Node.js >= 18
# (raccomandato via nvm)

# Tauri CLI
cargo install tauri-cli

# Dipendenze progetto
npm install

# Dev server
npm run tauri dev

# Build produzione
npm run tauri build
```

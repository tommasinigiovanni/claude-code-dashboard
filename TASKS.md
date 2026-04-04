# TASKS — Claude Code Dashboard

> Versione 0.1 — Breakdown task di sviluppo

Le task sono ordinate in **milestone** progressive. Ogni milestone produce qualcosa di funzionante e testabile. Seguire l'ordine è importante perché ogni step dipende dal precedente.

---

## Milestone 0 — Setup progetto

- [x] **M0-1** Installare Rust (`rustup`)
- [x] **M0-2** Installare Node.js >= 18 (via nvm consigliato)
- [x] **M0-3** Creare progetto Tauri 2 con template React + TypeScript
  ```bash
  npm create tauri-app@latest claude-code-dashboard
  # Scegli: React, TypeScript, Vite
  ```
- [x] **M0-4** Installare dipendenze frontend
  ```bash
  npm install
  npm install zustand
  npx shadcn@latest init
  ```
- [x] **M0-5** Configurare Tailwind CSS v4
- [x] **M0-6** Aggiungere dipendenze Rust in `Cargo.toml`
  ```toml
  serde = { version = "1", features = ["derive"] }
  serde_json = "1"
  dirs = "5"
  tokio = { version = "1", features = ["full"] }
  ```
- [x] **M0-7** Verificare che `npm run tauri dev` avvii correttamente una finestra vuota

---

## Milestone 1 — Layout base e navigazione

- [x] **M1-1** Creare layout principale: `TopBar` + `Sidebar` + `MainContent`
- [x] **M1-2** Implementare navigazione sidebar con 4 voci (MCP, Skills, Sub-agents, Launcher)
- [x] **M1-3** Implementare `ContextSwitcher` nella topbar (dropdown Global / Project)
- [x] **M1-4** Implementare dialog nativo per selezione cartella progetto (Tauri `open()`)
- [x] **M1-5** Creare `configStore` Zustand con stato scope attivo
- [x] **M1-6** Applicare tema dark di default con shadcn/ui

**✅ Deliverable M1:** App navigabile con layout completo, nessun dato reale ancora.

---

## Milestone 2 — Lettura configurazione

- [x] **M2-1** Implementare Tauri command `read_config` in Rust
  - Legge `~/.claude/claude.json` (scope global)
  - Legge `{path}/.claude/claude.json` (scope project)
  - Gestisce file mancante (ritorna config vuota)
- [x] **M2-2** Definire tipi TypeScript in `types/claude.ts`
- [x] **M2-3** Implementare hook `useConfig` che invoca `read_config` via Tauri
- [x] **M2-4** Popolare `configStore` con i dati letti
- [x] **M2-5** Implementare logica merge global + project per entità UI
- [x] **M2-6** Aggiungere loading state e gestione errori

**✅ Deliverable M2:** L'app legge e mostra nel log/console i dati reali di `claude.json`.

---

## Milestone 3 — MCP Manager

- [x] **M3-1** Creare `McpList` con lista di `McpCard`
- [x] **M3-2** `McpCard`: mostrare nome, comando, stato, scope badge
- [x] **M3-3** Implementare toggle on/off MCP (abilitare/disabilitare nel JSON)
- [x] **M3-4** Implementare Tauri command `write_config`
  - Backup automatico (`claude.json.bak`) prima di scrivere
  - Scrittura atomica
- [x] **M3-5** Creare `McpForm` (modal/panel) per aggiunta nuovo MCP
  - Campi: nome, comando, argomenti, variabili env, scope
- [x] **M3-6** Implementare aggiunta MCP → scrittura su JSON
- [x] **M3-7** Implementare menu `⋯` con Modifica ed Elimina
- [x] **M3-8** Toast feedback per ogni azione

**✅ Deliverable M3:** MCP Manager completamente funzionante.

---

## Milestone 4 — Skills Viewer

- [x] **M4-1** Creare `SkillsList` con lista di `SkillCard`
- [x] **M4-2** `SkillCard`: mostrare nome, path, descrizione
- [x] **M4-3** Implementare lettura prima riga di `SKILL.md` per descrizione (Tauri command `read_skill_description`)
- [x] **M4-4** Implementare Tauri command `open_folder` per aprire cartella nel file explorer nativo
- [x] **M4-5** Bottone "Apri cartella" su ogni SkillCard

**✅ Deliverable M4:** Skills Viewer funzionante (read-only).

---

## Milestone 5 — Sub-agents Manager

- [x] **M5-1** Creare `SubagentList` con lista di `SubagentCard`
- [x] **M5-2** `SubagentCard`: mostrare nome, descrizione, stato, scope badge
- [x] **M5-3** Implementare toggle on/off sub-agent
- [x] **M5-4** Creare `SubagentForm` per aggiunta/modifica sub-agent
  - Campi: nome, descrizione, prompt (textarea), scope
- [x] **M5-5** Implementare aggiunta sub-agent → scrittura su JSON
- [x] **M5-6** Implementare modifica sub-agent esistente
- [x] **M5-7** Implementare eliminazione sub-agent con conferma
- [x] **M5-8** Toast feedback per ogni azione

**✅ Deliverable M5:** Sub-agents Manager completamente funzionante.

---

## Milestone 6 — Quick Launcher

- [x] **M6-1** Creare pagina `LauncherPage` con riepilogo configurazione attiva
- [x] **M6-2** Mostrare conteggio MCP attivi, sub-agents, skills
- [x] **M6-3** Implementare Tauri command `check_claude_installed`
  - Cerca `claude` nel PATH di sistema
- [x] **M6-4** Implementare Tauri command `launch_claude_code`
  - Esegue `claude` nella cartella selezionata
  - Apre un terminale nativo (Terminal.app su macOS, cmd/PowerShell su Windows, xterm su Linux)
- [x] **M6-5** Gestire errore "Claude Code non trovato" con messaggio e istruzioni installazione
- [x] **M6-6** Salvare e mostrare lista ultimi 5 avvii recenti (persistiti in localStorage Tauri)
- [x] **M6-7** Pulsante ▶ sugli avvii recenti per rilanciare rapidamente

**✅ Deliverable M6:** Quick Launcher funzionante. MVP completo.

---

## Milestone 7 — System Tray + distribuzione

- [x] **M7-1** Implementare `tray.rs` con icona nel system tray
- [x] **M7-2** Menu tray: Apri dashboard, Avvia Claude Code, Esci
- [x] **M7-3** Comportamento finestra: chiudendo la X va nel tray (non esce)
- [x] **M7-4** Configurare `tauri.conf.json` per build di produzione
  - Bundle identifier, nome app, icone
- [x] **M7-5** Creare icone app per tutte le piattaforme (1024x1024 PNG → generazione automatica)
- [x] **M7-6** Setup GitHub Actions con `tauri-action` per build automatica su push
- [x] **M7-7** Testare installer su macOS, Windows, Linux

**✅ Deliverable M7:** App distribuibile e installabile.

---

## Milestone 8 — Settings

- [x] **M8-1** Creare pagina Settings
- [x] **M8-2** Toggle tema Dark/Light/Sistema
- [x] **M8-3** Toggle avvio con il sistema
- [x] **M8-4** Campo percorso Claude Code (override del PATH)
- [x] **M8-5** Persistenza settings (Tauri store plugin)

---

## Backlog post-MVP

- [ ] Profili di configurazione (es. "Modalità scrittura", "Modalità DevOps")
- [x] Marketplace browser per MCP e skills (toggle plugin attivi/disattivi)
- [ ] Log viewer in tempo reale
- [ ] Health check MCP servers
- [ ] Import/Export configurazione
- [ ] Onboarding wizard per nuovi utenti
- [x] Localizzazione (EN/IT)

## Extra implementati (non nel piano originale)

- [x] Cloud MCP connectors (lettura da claude.ai)
- [x] Custom skills da ~/.claude/skills/ e ~/.claude/commands/
- [x] Custom agents da ~/.claude/agents/ (editabili/eliminabili)
- [x] Project-local skills e config
- [x] Terminale embedded (xterm.js + PTY)
- [x] tmux con split pane (Claude sopra + shell sotto)
- [x] Chat mode PTY-based per utenti non tecnici
- [x] Approvazione permessi nella Chat (Approve/Reject buttons)
- [x] Telegram bot con sessioni, bottoni inline, memoria conversazione
- [x] Command Palette (Cmd+K)
- [x] Progetti recenti da history sessioni Claude Code
- [x] Upload immagini nella Chat
- [x] Sidebar collassabile
- [x] Path copiabile con click
- [x] System tray con icona
- [x] Scelta terminale esterno (Terminal, iTerm2, Warp, Alacritty, custom)
- [x] Pulizia dati locali nei Settings

---

## Note per Claude Code

- Leggere `ARCHITECTURE.md` prima di iniziare qualsiasi milestone
- Leggere `DATA_MODEL.md` prima di lavorare su qualsiasi lettura/scrittura config
- Ogni Tauri command deve avere gestione errori esplicita (mai `unwrap()` in produzione)
- Fare sempre backup di `claude.json` prima di scrivere
- I test manuali prioritari: macOS first, poi Windows, poi Linux

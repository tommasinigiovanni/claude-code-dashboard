# TASKS — Claude Code Dashboard

> Versione 0.1 — Breakdown task di sviluppo

Le task sono ordinate in **milestone** progressive. Ogni milestone produce qualcosa di funzionante e testabile. Seguire l'ordine è importante perché ogni step dipende dal precedente.

---

## Milestone 0 — Setup progetto

- [ ] **M0-1** Installare Rust (`rustup`)
- [ ] **M0-2** Installare Node.js >= 18 (via nvm consigliato)
- [ ] **M0-3** Creare progetto Tauri 2 con template React + TypeScript
  ```bash
  npm create tauri-app@latest claude-code-dashboard
  # Scegli: React, TypeScript, Vite
  ```
- [ ] **M0-4** Installare dipendenze frontend
  ```bash
  npm install
  npm install zustand
  npx shadcn@latest init
  ```
- [ ] **M0-5** Configurare Tailwind CSS v4
- [ ] **M0-6** Aggiungere dipendenze Rust in `Cargo.toml`
  ```toml
  serde = { version = "1", features = ["derive"] }
  serde_json = "1"
  dirs = "5"
  tokio = { version = "1", features = ["full"] }
  ```
- [ ] **M0-7** Verificare che `npm run tauri dev` avvii correttamente una finestra vuota

---

## Milestone 1 — Layout base e navigazione

- [ ] **M1-1** Creare layout principale: `TopBar` + `Sidebar` + `MainContent`
- [ ] **M1-2** Implementare navigazione sidebar con 4 voci (MCP, Skills, Sub-agents, Launcher)
- [ ] **M1-3** Implementare `ContextSwitcher` nella topbar (dropdown Global / Project)
- [ ] **M1-4** Implementare dialog nativo per selezione cartella progetto (Tauri `open()`)
- [ ] **M1-5** Creare `configStore` Zustand con stato scope attivo
- [ ] **M1-6** Applicare tema dark di default con shadcn/ui

**✅ Deliverable M1:** App navigabile con layout completo, nessun dato reale ancora.

---

## Milestone 2 — Lettura configurazione

- [ ] **M2-1** Implementare Tauri command `read_config` in Rust
  - Legge `~/.claude/claude.json` (scope global)
  - Legge `{path}/.claude/claude.json` (scope project)
  - Gestisce file mancante (ritorna config vuota)
- [ ] **M2-2** Definire tipi TypeScript in `types/claude.ts`
- [ ] **M2-3** Implementare hook `useConfig` che invoca `read_config` via Tauri
- [ ] **M2-4** Popolare `configStore` con i dati letti
- [ ] **M2-5** Implementare logica merge global + project per entità UI
- [ ] **M2-6** Aggiungere loading state e gestione errori

**✅ Deliverable M2:** L'app legge e mostra nel log/console i dati reali di `claude.json`.

---

## Milestone 3 — MCP Manager

- [ ] **M3-1** Creare `McpList` con lista di `McpCard`
- [ ] **M3-2** `McpCard`: mostrare nome, comando, stato, scope badge
- [ ] **M3-3** Implementare toggle on/off MCP (abilitare/disabilitare nel JSON)
- [ ] **M3-4** Implementare Tauri command `write_config`
  - Backup automatico (`claude.json.bak`) prima di scrivere
  - Scrittura atomica
- [ ] **M3-5** Creare `McpForm` (modal/panel) per aggiunta nuovo MCP
  - Campi: nome, comando, argomenti, variabili env, scope
- [ ] **M3-6** Implementare aggiunta MCP → scrittura su JSON
- [ ] **M3-7** Implementare menu `⋯` con Modifica ed Elimina
- [ ] **M3-8** Toast feedback per ogni azione

**✅ Deliverable M3:** MCP Manager completamente funzionante.

---

## Milestone 4 — Skills Viewer

- [ ] **M4-1** Creare `SkillsList` con lista di `SkillCard`
- [ ] **M4-2** `SkillCard`: mostrare nome, path, descrizione
- [ ] **M4-3** Implementare lettura prima riga di `SKILL.md` per descrizione (Tauri command `read_skill_description`)
- [ ] **M4-4** Implementare Tauri command `open_folder` per aprire cartella nel file explorer nativo
- [ ] **M4-5** Bottone "Apri cartella" su ogni SkillCard

**✅ Deliverable M4:** Skills Viewer funzionante (read-only).

---

## Milestone 5 — Sub-agents Manager

- [ ] **M5-1** Creare `SubagentList` con lista di `SubagentCard`
- [ ] **M5-2** `SubagentCard`: mostrare nome, descrizione, stato, scope badge
- [ ] **M5-3** Implementare toggle on/off sub-agent
- [ ] **M5-4** Creare `SubagentForm` per aggiunta/modifica sub-agent
  - Campi: nome, descrizione, prompt (textarea), scope
- [ ] **M5-5** Implementare aggiunta sub-agent → scrittura su JSON
- [ ] **M5-6** Implementare modifica sub-agent esistente
- [ ] **M5-7** Implementare eliminazione sub-agent con conferma
- [ ] **M5-8** Toast feedback per ogni azione

**✅ Deliverable M5:** Sub-agents Manager completamente funzionante.

---

## Milestone 6 — Quick Launcher

- [ ] **M6-1** Creare pagina `LauncherPage` con riepilogo configurazione attiva
- [ ] **M6-2** Mostrare conteggio MCP attivi, sub-agents, skills
- [ ] **M6-3** Implementare Tauri command `check_claude_installed`
  - Cerca `claude` nel PATH di sistema
- [ ] **M6-4** Implementare Tauri command `launch_claude_code`
  - Esegue `claude` nella cartella selezionata
  - Apre un terminale nativo (Terminal.app su macOS, cmd/PowerShell su Windows, xterm su Linux)
- [ ] **M6-5** Gestire errore "Claude Code non trovato" con messaggio e istruzioni installazione
- [ ] **M6-6** Salvare e mostrare lista ultimi 5 avvii recenti (persistiti in localStorage Tauri)
- [ ] **M6-7** Pulsante ▶ sugli avvii recenti per rilanciare rapidamente

**✅ Deliverable M6:** Quick Launcher funzionante. MVP completo.

---

## Milestone 7 — System Tray + distribuzione

- [ ] **M7-1** Implementare `tray.rs` con icona nel system tray
- [ ] **M7-2** Menu tray: Apri dashboard, Avvia Claude Code, Esci
- [ ] **M7-3** Comportamento finestra: chiudendo la X va nel tray (non esce)
- [ ] **M7-4** Configurare `tauri.conf.json` per build di produzione
  - Bundle identifier, nome app, icone
- [ ] **M7-5** Creare icone app per tutte le piattaforme (1024x1024 PNG → generazione automatica)
- [ ] **M7-6** Setup GitHub Actions con `tauri-action` per build automatica su push
- [ ] **M7-7** Testare installer su macOS, Windows, Linux

**✅ Deliverable M7:** App distribuibile e installabile.

---

## Milestone 8 — Settings

- [ ] **M8-1** Creare pagina Settings
- [ ] **M8-2** Toggle tema Dark/Light/Sistema
- [ ] **M8-3** Toggle avvio con il sistema
- [ ] **M8-4** Campo percorso Claude Code (override del PATH)
- [ ] **M8-5** Persistenza settings (Tauri store plugin)

---

## Backlog post-MVP

- [ ] Profili di configurazione (es. "Modalità scrittura", "Modalità DevOps")
- [ ] Marketplace browser per MCP e skills
- [ ] Log viewer in tempo reale
- [ ] Health check MCP servers
- [ ] Import/Export configurazione
- [ ] Onboarding wizard per nuovi utenti
- [ ] Localizzazione (EN/IT)

---

## Note per Claude Code

- Leggere `ARCHITECTURE.md` prima di iniziare qualsiasi milestone
- Leggere `DATA_MODEL.md` prima di lavorare su qualsiasi lettura/scrittura config
- Ogni Tauri command deve avere gestione errori esplicita (mai `unwrap()` in produzione)
- Fare sempre backup di `claude.json` prima di scrivere
- I test manuali prioritari: macOS first, poi Windows, poi Linux

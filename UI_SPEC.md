# UI_SPEC — Claude Code Dashboard

> Versione 0.1 — Specifiche interfaccia utente

---

## 1. Principi di design

- **Dark mode di default** — adatta all'utente tecnico, più moderna
- **Minimal e pulita** — nessun elemento superfluo, focus sul contenuto
- **Feedback immediato** — ogni azione ha una risposta visiva (toggle, loading, toast)
- **Densità media** — non troppo compatta, non troppo spaziosa

Palette colori di riferimento: dark gray/zinc base (shadcn/ui default dark), accent in viola/blu (evoca Claude).

---

## 2. Layout generale

```
┌─────────────────────────────────────────────────────────┐
│  TOPBAR                                                   │
│  [🔵 Claude Code Dashboard]    [🌍 Global ▾] [⚡ Launch] │
├──────────┬──────────────────────────────────────────────┤
│          │                                               │
│ SIDEBAR  │  MAIN CONTENT AREA                            │
│          │                                               │
│ ● MCP    │                                               │
│ ○ Skills │                                               │
│ ○ Agents │                                               │
│ ○ Launch │                                               │
│          │                                               │
│          │                                               │
│          │                                               │
│──────────│                                               │
│ Settings │                                               │
└──────────┴───────────────────────────────────────────────┘
```

**Topbar** (altezza fissa ~52px):
- Logo/nome app a sinistra
- **Context Switcher** al centro-destra: dropdown `🌍 Global` / `📁 Project`
- **Launch button** a destra: pulsante primario "⚡ Avvia Claude Code"

**Sidebar** (larghezza fissa ~200px):
- Nav verticale con 4 voci principali
- Icona + label
- Voce attiva evidenziata
- Link "Settings" in fondo

---

## 3. Context Switcher

```
┌─────────────────────────┐
│ 🌍 Global               │
│ ─────────────────────── │
│ 📁 Project              │
│    /Users/gio/myproject  │
│    [Cambia cartella...]  │
└─────────────────────────┘
```

- Dropdown sempre visibile nella topbar
- Quando si seleziona "Project": si apre un dialog nativo per selezionare la cartella
- La cartella selezionata viene mostrata troncata (max ~30 caratteri con ellipsis)
- Badge colorato: **verde** = Global, **blu** = Project

---

## 4. Pagina MCP Manager

```
MCP Servers                              [+ Aggiungi MCP]
─────────────────────────────────────────────────────────

┌─────────────────────────────────────────────────────┐
│ 🟢  filesystem                          [●  ON  ] [⋯]│
│     npx @anthropic-ai/mcp-filesystem                │
│     Scope: 🌍 Global                                │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│ 🟢  brave-search                        [●  ON  ] [⋯]│
│     npx @modelcontextprotocol/brave     Scope: 🌍   │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│ ⚫  github                              [○  OFF ] [⋯]│
│     npx @modelcontextprotocol/github    Scope: 📁   │
└─────────────────────────────────────────────────────┘
```

**Card MCP:**
- Indicatore stato (verde = attivo, grigio = inattivo)
- Nome MCP (bold)
- Comando di avvio (testo secondario, monospace)
- Badge scope: 🌍 Global o 📁 Project
- Toggle on/off
- Menu `⋯`: Modifica, Elimina, Copia comando

**Panel "Aggiungi MCP"** (slide-in da destra o modal):
```
Nome MCP:      [___________________]
Comando:       [___________________]
               es. npx @org/mcp-name
Argomenti:     [___________________]
Variabili env: [+ Aggiungi]
Scope:         ○ Global  ○ Project

               [Annulla]  [Salva]
```

---

## 5. Pagina Skills Viewer

```
Skills                                          [📂 Apri cartella]
─────────────────────────────────────────────────────────────────

┌──────────────────────────────────────────────────────────┐
│ 📄  docx                                                  │
│     /mnt/skills/public/docx                              │
│     Create, read, edit Word documents                    │
│     Scope: 🌍 Global                           [📂] [⋯] │
└──────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────┐
│ 📄  pdf-reading                                           │
│     /mnt/skills/public/pdf-reading                       │
│     Read and extract content from PDF files             │
│     Scope: 🌍 Global                           [📂] [⋯] │
└──────────────────────────────────────────────────────────┘
```

- Lista cards con nome, path, descrizione breve (prima riga del SKILL.md)
- Bottone per aprire la cartella nel file explorer
- Nessuna modifica diretta delle skills (read-only nella v1.0)

---

## 6. Pagina Sub-agents Manager

```
Sub-agents                              [+ Nuovo sub-agent]
─────────────────────────────────────────────────────────

┌─────────────────────────────────────────────────────┐
│ 🤖  code-reviewer                    [●  ON  ] [⋯] │
│     Revisiona codice e suggerisce miglioramenti     │
│     Scope: 🌍 Global                               │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│ 🤖  doc-writer                       [●  ON  ] [⋯] │
│     Scrive documentazione tecnica                   │
│     Scope: 📁 Project                              │
└─────────────────────────────────────────────────────┘
```

**Panel modifica sub-agent:**
```
Nome:           [___________________]
Descrizione:    [___________________]
Prompt/istruzioni:
┌─────────────────────────────────┐
│                                 │
│  (textarea multilinea)          │
│                                 │
└─────────────────────────────────┘
Scope:          ○ Global  ○ Project

                [Annulla]  [Salva]
```

---

## 7. Pagina Quick Launcher

```
⚡ Avvia Claude Code
─────────────────────────────────────────────────────

  Configurazione attiva:    🌍 Global

  Cartella di avvio:
  ┌─────────────────────────────────────────┐
  │ /Users/giovanni/projects/my-app     [📂]│
  └─────────────────────────────────────────┘

  MCP attivi:     5 / 7
  Sub-agents:     2 / 3
  Skills:         4

                    ┌──────────────────────┐
                    │  ⚡ Avvia Claude Code │
                    └──────────────────────┘

  ─────────────────────────────────────────
  Avvii recenti:
  · /Users/giovanni/projects/my-app      [▶]
  · /Users/giovanni/projects/yoda        [▶]
  · /Users/giovanni/projects/conclave    [▶]
```

---

## 8. Toast & feedback

| Evento | Toast |
|---|---|
| MCP abilitato | ✅ "filesystem abilitato" |
| MCP disabilitato | ○ "github disabilitato" |
| Config salvata | ✅ "Configurazione salvata" |
| Errore scrittura | ❌ "Impossibile scrivere claude.json" |
| Claude Code avviato | ✅ "Claude Code avviato" |
| Claude Code non trovato | ❌ "Claude Code non trovato. Installa con: npm i -g @anthropic-ai/claude-code" |

---

## 9. Pagina Settings

- **Tema**: Dark / Light / Sistema
- **Avvio con il sistema**: toggle on/off
- **Mostra nel tray**: toggle on/off  
- **Percorso Claude Code**: campo editabile (default: autodetect da PATH)
- **Versione app**: info + link a changelog

# PRD — Claude Code Dashboard
> Versione 0.1 — Documento di requisiti di prodotto

---

## 1. Overview

**Claude Code Dashboard** è un'applicazione desktop cross-platform (Windows, macOS, Linux) che fornisce una GUI grafica per gestire l'ambiente di Claude Code: MCP servers, Skills, Sub-agents e configurazioni di progetto.

L'obiettivo è abbattere la barriera d'ingresso del terminale e rendere Claude Code accessibile e gestibile anche a utenti non sviluppatori, pur rimanendo uno strumento potente per chi il terminale lo conosce.

---

## 2. Problema

Claude Code è uno strumento potente, ma la sua gestione avviene interamente via terminale e file di configurazione JSON. Questo crea attrito per:

- Utenti non tecnici che vogliono usare Claude Code per scrittura, produttività, ecc.
- Sviluppatori che gestiscono configurazioni complesse con molti MCP e sub-agents
- Chiunque voglia passare rapidamente da un "profilo" di lavoro a un altro

---

## 3. Utenti target

| Tipo | Descrizione |
|---|---|
| **Non-developer** | Usa Claude Code per scrittura, ricerca, automazione. Vuole tutto funzionante senza toccare il terminale. |
| **Developer** | Gestisce più progetti con configurazioni diverse. Vuole visibilità e controllo rapido. |
| **Power user** | Sperimenta con MCP, skills e sub-agents custom. Vuole un'interfaccia per orchestrare il tutto. |

---

## 4. Feature — MVP (v1.0)

### 4.1 MCP Manager
- Visualizzare tutti gli MCP server installati (nome, comando, stato attivo/inattivo)
- Abilitare / disabilitare un MCP con toggle
- Visualizzare i parametri di configurazione di ciascun MCP
- Aggiungere un nuovo MCP server (form guidato)
- Eliminare un MCP server

### 4.2 Skills Viewer
- Visualizzare tutte le Skills disponibili (nome, descrizione, path)
- Aprire la cartella della skill nel file explorer
- Indicatore visivo se la skill è referenziata nella configurazione attiva

### 4.3 Sub-agents Manager
- Visualizzare tutti i sub-agents configurati
- Visualizzare il prompt/istruzioni di ciascun sub-agent
- Abilitare / disabilitare un sub-agent
- Aggiungere / modificare / eliminare un sub-agent

### 4.4 Quick Launcher
- Avviare Claude Code dal pulsante nella dashboard
- Selezionare il profilo di configurazione con cui avviarlo (global o project-specific)
- Selezionare la cartella di progetto prima del lancio

### 4.5 Context Switcher — Global / Project
- Selettore sempre visibile in alto nell'interfaccia
- Modalità **Global**: mostra e modifica `~/.claude/claude.json`
- Modalità **Project**: permette di selezionare una cartella e mostra/modifica `.claude/claude.json` al suo interno
- Indicatore visivo per distinguere quali elementi sono ereditati dal global e quali sono locali

---

## 5. Feature — Post-MVP (roadmap)

- **Profili di configurazione** — salva e ricarica set di MCP/skills/sub-agents predefiniti (es. "Modalità scrittura", "Modalità DevOps")
- **Marketplace browser** — sfoglia e installa MCP servers e skills dalla community direttamente dalla GUI
- **Log viewer** — visualizza i log di Claude Code in tempo reale
- **Progetti recenti** — lista degli ultimi progetti aperti, letti dalla history di Claude Code
- **Health check** — verifica che ogni MCP server risponda correttamente
- **Import/Export configurazione** — esporta il tuo setup come file e importalo su altra macchina

---

## 6. Non-obiettivi (v1.0)

- Non è un client chat per Claude (non sostituisce Claude.ai o Claude Desktop)
- Non esegue direttamente comandi Claude Code nell'interfaccia (solo launcher)
- Non gestisce autenticazione o API keys di Anthropic

---

## 7. Metriche di successo

- Tempo per installare un nuovo MCP: < 2 minuti senza toccare il terminale
- Un utente non tecnico riesce a configurare un ambiente base in autonomia
- L'app consuma < 50MB di RAM in idle

---

## 8. Naming

Il nome del prodotto è da definire. Requisiti: breve, riconoscibile, evoca "controllo" o "dashboard" legato a Claude Code.

Candidati suggeriti: `Kodama`, `ClaudeDeck`, `CCUI`, `Commandeck`

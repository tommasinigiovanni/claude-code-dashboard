# DATA_MODEL — Claude Code Dashboard

> Versione 0.1 — Modello dati e struttura configurazione

---

## 1. Struttura `claude.json`

Claude Code utilizza file di configurazione JSON in due posizioni:

| Scope | Path |
|---|---|
| Global | `~/.claude/claude.json` |
| Project | `{project_root}/.claude/claude.json` |

### Struttura base del file

```json
{
  "mcpServers": {
    "filesystem": {
      "command": "npx",
      "args": ["-y", "@anthropic-ai/mcp-filesystem", "/Users/giovanni"],
      "env": {}
    },
    "brave-search": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/brave"],
      "env": {
        "BRAVE_API_KEY": "BSA..."
      }
    }
  },
  "skills": [
    {
      "name": "docx",
      "path": "/mnt/skills/public/docx"
    }
  ],
  "agents": {
    "code-reviewer": {
      "description": "Revisiona codice e suggerisce miglioramenti",
      "prompt": "Sei un esperto revisore di codice...",
      "enabled": true
    }
  }
}
```

> **Nota:** La struttura esatta di `skills` e `agents` può variare tra versioni di Claude Code. Il DATA_MODEL va verificato contro la versione installata. I campi sopra sono la rappresentazione più comune alla data di questo documento.

---

## 2. Tipi TypeScript

```typescript
// types/claude.ts

// ─── MCP Server ───────────────────────────────────────

export interface McpServer {
  command: string
  args?: string[]
  env?: Record<string, string>
}

export type McpServersMap = Record<string, McpServer>

// ─── Skill ────────────────────────────────────────────

export interface Skill {
  name: string
  path: string
}

// ─── Sub-agent ────────────────────────────────────────

export interface SubAgent {
  description?: string
  prompt: string
  enabled?: boolean
}

export type AgentsMap = Record<string, SubAgent>

// ─── Config root ──────────────────────────────────────

export interface ClaudeConfig {
  mcpServers?: McpServersMap
  skills?: Skill[]
  agents?: AgentsMap
}

// ─── Config scope (usato dall'app, non nel JSON) ───────

export type ConfigScope = 'global' | 'project'

export interface ScopedConfig {
  scope: ConfigScope
  projectPath?: string
  config: ClaudeConfig
}

// ─── Entità arricchite per la UI ──────────────────────
// Aggiungono campi derivati non presenti nel JSON originale

export interface McpServerUI extends McpServer {
  id: string              // key nel map (es. "filesystem")
  enabled: boolean        // derivato: presente nel JSON = abilitato
  scope: ConfigScope      // da quale file proviene
}

export interface SkillUI extends Skill {
  description?: string    // letta dalla prima riga di SKILL.md
  scope: ConfigScope
}

export interface SubAgentUI extends SubAgent {
  id: string              // key nel map
  scope: ConfigScope
}
```

---

## 3. Store Zustand

```typescript
// store/configStore.ts

interface ConfigStore {
  // Scope attivo
  activeScope: ConfigScope
  projectPath: string | null

  // Config caricata
  globalConfig: ClaudeConfig | null
  projectConfig: ClaudeConfig | null

  // Stato caricamento
  isLoading: boolean
  error: string | null

  // Entità UI derivate (merge di global + project)
  mcpServers: McpServerUI[]
  skills: SkillUI[]
  subAgents: SubAgentUI[]

  // Actions
  setScope: (scope: ConfigScope, projectPath?: string) => void
  loadConfigs: () => Promise<void>
  toggleMcp: (id: string, scope: ConfigScope) => Promise<void>
  addMcp: (id: string, server: McpServer, scope: ConfigScope) => Promise<void>
  removeMcp: (id: string, scope: ConfigScope) => Promise<void>
  addSubAgent: (id: string, agent: SubAgent, scope: ConfigScope) => Promise<void>
  updateSubAgent: (id: string, agent: SubAgent, scope: ConfigScope) => Promise<void>
  removeSubAgent: (id: string, scope: ConfigScope) => Promise<void>
}
```

---

## 4. Merge Global + Project

Quando si è in modalità **Project**, entrambe le config vengono lette e mergiate per mostrare la visione completa dell'ambiente attivo:

```typescript
function mergeConfigs(
  global: ClaudeConfig,
  project: ClaudeConfig
): { mcpServers: McpServerUI[], skills: SkillUI[], subAgents: SubAgentUI[] } {

  // MCP: project override su global per stesso ID
  const allMcp = {
    ...Object.entries(global.mcpServers ?? {}).map(([id, s]) =>
      ({ ...s, id, scope: 'global' as ConfigScope, enabled: true })),
    ...Object.entries(project.mcpServers ?? {}).map(([id, s]) =>
      ({ ...s, id, scope: 'project' as ConfigScope, enabled: true }))
  }

  // Skills: concatenazione, deduplicate per path
  // Sub-agents: project override su global per stesso ID

  return { mcpServers, skills, subAgents }
}
```

---

## 5. Struttura Rust (src-tauri)

```rust
// config.rs

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct McpServer {
    pub command: String,
    pub args: Option<Vec<String>>,
    pub env: Option<HashMap<String, String>>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Skill {
    pub name: String,
    pub path: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SubAgent {
    pub description: Option<String>,
    pub prompt: String,
    pub enabled: Option<bool>,
}

#[derive(Debug, Serialize, Deserialize, Clone, Default)]
pub struct ClaudeConfig {
    #[serde(rename = "mcpServers", skip_serializing_if = "Option::is_none")]
    pub mcp_servers: Option<HashMap<String, McpServer>>,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub skills: Option<Vec<Skill>>,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub agents: Option<HashMap<String, SubAgent>>,
}
```

---

## 6. Path resolution

```rust
fn get_config_path(scope: &str, project_path: Option<&str>) -> PathBuf {
    match scope {
        "global" => {
            dirs::home_dir()
                .expect("Home dir not found")
                .join(".claude")
                .join("claude.json")
        }
        "project" => {
            PathBuf::from(project_path.expect("Project path required"))
                .join(".claude")
                .join("claude.json")
        }
        _ => panic!("Invalid scope")
    }
}
```

---

## 7. Note di compatibilità

- Verificare la struttura esatta di `claude.json` con `claude --version` e documentazione ufficiale Anthropic
- La struttura `agents`/sub-agents potrebbe usare una chiave diversa in versioni future di Claude Code
- Il parsing deve essere **tollerante** (campi opzionali, valori nulli gestiti) per non crashare su configurazioni parziali
- Prima di scrivere il file, fare sempre un **backup** del JSON esistente (`claude.json.bak`)

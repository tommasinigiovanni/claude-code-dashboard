export type Locale = 'it' | 'en'

const translations = {
  // Sidebar
  'nav.mcp': { it: 'MCP Servers', en: 'MCP Servers' },
  'nav.skills': { it: 'Skills & Plugins', en: 'Skills & Plugins' },
  'nav.subagents': { it: 'Sub-agents', en: 'Sub-agents' },
  'nav.launcher': { it: 'Launcher', en: 'Launcher' },
  'nav.settings': { it: 'Impostazioni', en: 'Settings' },
  'nav.profiles': { it: 'Profili', en: 'Profiles' },
  'nav.logs': { it: 'Log Sessioni', en: 'Session Logs' },
  'nav.health': { it: 'Health Check', en: 'Health Check' },
  'nav.changelog': { it: 'Changelog', en: 'Changelog' },
  'nav.hooks': { it: 'Hooks', en: 'Hooks' },
  'nav.usage': { it: 'Costi e Utilizzo', en: 'Cost & Usage' },
  'nav.claudemd': { it: 'CLAUDE.md', en: 'CLAUDE.md' },
  'nav.docs': { it: 'Documentazione', en: 'Documentation' },
  'nav.credits': { it: 'Credits', en: 'Credits' },

  // TopBar
  'topbar.dashboard': { it: 'Dashboard', en: 'Dashboard' },
  'topbar.global': { it: 'Globale', en: 'Global' },
  'topbar.selectProject': { it: 'Seleziona progetto…', en: 'Select project…' },
  'topbar.recentProjects': { it: 'Progetti recenti', en: 'Recent projects' },

  // MCP Page
  'mcp.title': { it: 'MCP Servers', en: 'MCP Servers' },
  'mcp.addMcp': { it: '+ Aggiungi MCP', en: '+ Add MCP' },
  'mcp.cloudConnectors': { it: 'Cloud Connectors (claude.ai)', en: 'Cloud Connectors (claude.ai)' },
  'mcp.localServers': { it: 'MCP Servers Locali', en: 'Local MCP Servers' },
  'mcp.noServers': { it: 'Nessun MCP server configurato.', en: 'No MCP servers configured.' },
  'mcp.edit': { it: 'Modifica', en: 'Edit' },
  'mcp.delete': { it: 'Elimina', en: 'Delete' },
  'mcp.addTitle': { it: 'Aggiungi MCP', en: 'Add MCP' },
  'mcp.editTitle': { it: 'Modifica MCP', en: 'Edit MCP' },
  'mcp.name': { it: 'Nome', en: 'Name' },
  'mcp.command': { it: 'Comando', en: 'Command' },
  'mcp.args': { it: 'Argomenti (separati da spazi)', en: 'Arguments (space-separated)' },
  'mcp.env': { it: 'Variabili ambiente (KEY=VALUE, una per riga)', en: 'Environment variables (KEY=VALUE, one per line)' },
  'mcp.scope': { it: 'Scope', en: 'Scope' },
  'mcp.save': { it: 'Salva', en: 'Save' },
  'mcp.add': { it: 'Aggiungi', en: 'Add' },
  'mcp.saving': { it: 'Salvataggio…', en: 'Saving…' },

  // Skills Page
  'skills.title': { it: 'Skills & Plugins', en: 'Skills & Plugins' },
  'skills.installedPlugins': { it: 'Plugins Installati', en: 'Installed Plugins' },
  'skills.availableSkills': { it: 'Skills Disponibili', en: 'Available Skills' },
  'skills.configSkills': { it: 'Skills da Configurazione', en: 'Configuration Skills' },
  'skills.noSkills': { it: 'Nessuna Skill o Plugin configurato.', en: 'No Skills or Plugins configured.' },
  'skills.active': { it: 'attivo', en: 'active' },
  'skills.disabled': { it: 'disattivato', en: 'disabled' },

  // Sub-agents Page
  'agents.title': { it: 'Sub-agents', en: 'Sub-agents' },
  'agents.addAgent': { it: '+ Aggiungi Sub-agent', en: '+ Add Sub-agent' },
  'agents.userAgents': { it: 'User Agents', en: 'User Agents' },
  'agents.pluginAgents': { it: 'Agents da Plugin', en: 'Plugin Agents' },
  'agents.configAgents': { it: 'Agents da Configurazione', en: 'Configuration Agents' },
  'agents.customAgents': { it: 'Agents Personalizzati', en: 'Custom Agents' },
  'agents.noAgents': { it: 'Nessun Sub-agent configurato.', en: 'No Sub-agents configured.' },
  'agents.editAgent': { it: 'Modifica Agent', en: 'Edit Agent' },
  'agents.addAgentTitle': { it: 'Aggiungi Sub-agent', en: 'Add Sub-agent' },
  'agents.editAgentTitle': { it: 'Modifica Sub-agent', en: 'Edit Sub-agent' },
  'agents.description': { it: 'Descrizione', en: 'Description' },
  'agents.prompt': { it: 'Prompt', en: 'Prompt' },
  'agents.terminate': { it: 'Termina', en: 'Terminate' },
  'agents.reattach': { it: 'Riattacca', en: 'Reattach' },

  // Launcher Page
  'launcher.title': { it: 'Launcher', en: 'Launcher' },
  'launcher.installed': { it: 'Installato e disponibile', en: 'Installed and available' },
  'launcher.notFound': { it: 'Non trovato nel PATH', en: 'Not found in PATH' },
  'launcher.checking': { it: 'Verifica installazione…', en: 'Checking installation…' },
  'launcher.launch': { it: '▶ Avvia Claude Code', en: '▶ Launch Claude Code' },
  'launcher.selectAndLaunch': { it: '📁 Seleziona cartella e avvia', en: '📁 Select folder and launch' },
  'launcher.recentLaunches': { it: 'Avvii recenti', en: 'Recent launches' },
  'launcher.tmuxSessions': { it: 'Sessioni tmux attive', en: 'Active tmux sessions' },
  'launcher.activeContext': { it: 'Contesto attivo', en: 'Active context' },
  'launcher.close': { it: 'Chiudi', en: 'Close' },
  'launcher.embeddedTerminal': { it: 'Terminale integrato', en: 'Embedded terminal' },
  'launcher.chatWithClaude': { it: 'Chat con Claude', en: 'Chat with Claude' },

  // Chat
  'chat.title': { it: 'Chat con Claude Code', en: 'Chat with Claude Code' },
  'chat.placeholder': { it: 'Scrivi un messaggio... (Cmd+V per incollare immagini)', en: 'Type a message... (Cmd+V to paste images)' },
  'chat.send': { it: 'Invia', en: 'Send' },
  'chat.thinking': { it: 'Ragionamento...', en: 'Thinking...' },
  'chat.showThinking': { it: 'Mostra ragionamento', en: 'Show thinking' },
  'chat.newConversation': { it: 'Nuova conversazione', en: 'New conversation' },
  'chat.shiftEnter': { it: 'Shift+Enter per andare a capo · Trascina o incolla immagini', en: 'Shift+Enter for new line · Drag or paste images' },
  'chat.welcome': { it: 'Scrivi un messaggio per iniziare. Puoi anche incollare o trascinare immagini.', en: 'Type a message to start. You can also paste or drag images.' },

  // Settings
  'settings.title': { it: 'Impostazioni', en: 'Settings' },
  'settings.theme': { it: 'Tema', en: 'Theme' },
  'settings.dark': { it: '🌙 Dark', en: '🌙 Dark' },
  'settings.light': { it: '☀️ Light', en: '☀️ Light' },
  'settings.system': { it: '💻 Sistema', en: '💻 System' },
  'settings.terminal': { it: 'Terminale', en: 'Terminal' },
  'settings.terminalDesc': { it: 'Terminale usato per avviare Claude Code dal Launcher.', en: 'Terminal used to launch Claude Code from the Launcher.' },
  'settings.useTmux': { it: 'Usa tmux', en: 'Use tmux' },
  'settings.tmuxDesc': { it: 'Le sessioni Claude Code persistono anche chiudendo la dashboard.', en: 'Claude Code sessions persist even after closing the dashboard.' },
  'settings.claudePath': { it: 'Percorso Claude Code (override)', en: 'Claude Code path (override)' },
  'settings.claudePathPlaceholder': { it: 'Lascia vuoto per usare il PATH di sistema', en: 'Leave empty to use system PATH' },
  'settings.claudePathDesc': { it: 'Se Claude Code non viene trovato automaticamente, specifica il percorso completo qui.', en: 'If Claude Code is not found automatically, specify the full path here.' },
  'settings.language': { it: 'Lingua', en: 'Language' },
  'settings.localData': { it: 'Dati locali', en: 'Local data' },
  'settings.clearChatHistory': { it: 'Pulisci cronologia chat', en: 'Clear chat history' },
  'settings.clearRecentLaunches': { it: 'Pulisci avvii recenti', en: 'Clear recent launches' },
  'settings.localDataDesc': { it: 'Elimina i dati salvati localmente. Le configurazioni Claude Code non vengono toccate.', en: 'Delete locally saved data. Claude Code configurations are not affected.' },
  'settings.saved': { it: 'Impostazione salvata', en: 'Setting saved' },

  // Command Palette
  'palette.search': { it: 'Cerca pagina o sessione tmux...', en: 'Search page or tmux session...' },
  'palette.navigation': { it: 'Navigazione', en: 'Navigation' },
  'palette.tmuxSessions': { it: 'Sessioni tmux', en: 'tmux Sessions' },
  'palette.noResults': { it: 'Nessun risultato', en: 'No results' },

  // MCP Page (extended)
  'mcp.statsCloud': { it: 'Cloud', en: 'Cloud' },
  'mcp.statsLocal': { it: 'Locali', en: 'Local' },
  'mcp.searchPlaceholder': { it: 'Cerca MCP servers...', en: 'Search MCP servers...' },
  'mcp.noResults': { it: 'Nessun risultato per la ricerca.', en: 'No results for your search.' },
  'mcp.emptyDesc': { it: 'Aggiungi un MCP server per iniziare.', en: 'Add an MCP server to get started.' },

  // Skills Page (extended)
  'skills.statsPlugins': { it: 'Plugins', en: 'Plugins' },
  'skills.statsSkills': { it: 'Skills', en: 'Skills' },
  'skills.searchPlaceholder': { it: 'Cerca skills e plugins...', en: 'Search skills and plugins...' },
  'skills.filterAll': { it: 'Tutti', en: 'All' },
  'skills.filterPlugins': { it: 'Plugins', en: 'Plugins' },
  'skills.filterSkills': { it: 'Skills', en: 'Skills' },
  'skills.emptyDesc': { it: 'Nessun plugin o skill trovato. Installa dei plugin dal marketplace.', en: 'No plugins or skills found. Install plugins from the marketplace.' },

  // Sub-agents (extended)
  'agents.statsUser': { it: 'User', en: 'User' },
  'agents.statsPlugin': { it: 'Plugin', en: 'Plugin' },
  'agents.statsConfig': { it: 'Config', en: 'Config' },
  'agents.searchPlaceholder': { it: 'Cerca agents...', en: 'Search agents...' },
  'agents.emptyDesc': { it: 'Aggiungi un sub-agent per delegare compiti specifici.', en: 'Add a sub-agent to delegate specific tasks.' },

  // Profiles (extended)
  'profiles.title': { it: 'Profili', en: 'Profiles' },
  'profiles.saveCurrentConfig': { it: '+ Salva configurazione attuale', en: '+ Save current config' },
  'profiles.description': { it: 'Salva e carica profili di configurazione per passare rapidamente tra diversi setup.', en: 'Save and load configuration profiles to quickly switch between different setups.' },
  'profiles.emptyTitle': { it: 'Nessun profilo salvato', en: 'No saved profiles' },
  'profiles.emptyDesc': { it: 'Salva la tua configurazione attuale come profilo per poterla ripristinare in futuro.', en: 'Save your current configuration as a profile to restore it later.' },
  'profiles.load': { it: 'Carica', en: 'Load' },
  'profiles.delete': { it: 'Elimina', en: 'Delete' },
  'profiles.confirmLoad': { it: 'Caricare il profilo "{name}"? La configurazione attuale verra\' sovrascritta.', en: 'Load profile "{name}"? Current configuration will be overwritten.' },
  'profiles.confirmDelete': { it: 'Eliminare il profilo "{name}"?', en: 'Delete profile "{name}"?' },
  'profiles.saved': { it: 'Profilo salvato', en: 'Profile saved' },
  'profiles.loaded': { it: 'Profilo caricato', en: 'Profile loaded' },
  'profiles.saveDialog': { it: 'Salva profilo', en: 'Save profile' },
  'profiles.namePlaceholder': { it: 'es. produzione', en: 'e.g. production' },
  'profiles.descPlaceholder': { it: 'Descrizione opzionale...', en: 'Optional description...' },
  'profiles.cancel': { it: 'Annulla', en: 'Cancel' },

  // Logs (extended)
  'logs.title': { it: 'Log Sessioni', en: 'Session Logs' },
  'logs.refresh': { it: 'Aggiorna', en: 'Refresh' },
  'logs.project': { it: 'Progetto', en: 'Project' },
  'logs.filterAll': { it: 'Tutti', en: 'All' },
  'logs.filterUser': { it: 'User', en: 'User' },
  'logs.filterAssistant': { it: 'Assistant', en: 'Assistant' },
  'logs.filterTool': { it: 'Tool', en: 'Tool' },
  'logs.emptyTitle': { it: 'Nessun log trovato', en: 'No logs found' },
  'logs.emptyDesc': { it: 'Avvia una sessione di Claude Code per vedere i log qui.', en: 'Start a Claude Code session to see logs here.' },
  'logs.entries': { it: 'voci', en: 'entries' },
  'logs.scrollBottom': { it: 'Vai in fondo', en: 'Scroll to bottom' },

  // Health (extended)
  'health.title': { it: 'Health Check', en: 'Health Check' },
  'health.description': { it: 'Verifica lo stato di connessione dei server MCP configurati.', en: 'Check the connection status of configured MCP servers.' },
  'health.runCheck': { it: 'Esegui check', en: 'Run check' },
  'health.checking': { it: 'Verifica in corso...', en: 'Checking...' },
  'health.connected': { it: 'Connesso', en: 'Connected' },
  'health.disconnected': { it: 'Disconnesso', en: 'Disconnected' },
  'health.noServers': { it: 'Nessun server MCP configurato.', en: 'No MCP servers configured.' },
  'health.noServersDesc': { it: 'Aggiungi dei server MCP nella pagina apposita per verificarne lo stato.', en: 'Add MCP servers from the MCP page to check their status.' },
  'health.autoRefresh': { it: 'Auto-aggiornamento', en: 'Auto-refresh' },
  'health.lastCheck': { it: 'Ultimo check', en: 'Last check' },
  'health.statsConnected': { it: 'Connessi', en: 'Connected' },
  'health.statsDisconnected': { it: 'Disconnessi', en: 'Disconnected' },

  // Credits (extended)
  'credits.title': { it: 'Credits', en: 'Credits' },
  'credits.builtWith': { it: 'Sviluppato con', en: 'Built with' },
  'credits.pairProgramming': { it: 'Interamente progettato e sviluppato in pair programming con Claude Code.', en: 'Entirely designed and developed in pair programming with Claude Code.' },

  // Common
  'common.global': { it: 'Globale', en: 'Global' },
  'common.project': { it: 'Progetto', en: 'Project' },
  'common.cloud': { it: 'cloud', en: 'cloud' },
  'common.error': { it: 'Errore', en: 'Error' },
  'common.loading': { it: 'Caricamento configurazione…', en: 'Loading configuration…' },
  'common.pathCopied': { it: 'Path copiato!', en: 'Path copied!' },
  'common.removed': { it: 'rimosso', en: 'removed' },
  'common.added': { it: 'aggiunto', en: 'added' },
  'common.updated': { it: 'aggiornato', en: 'updated' },
  'common.activated': { it: 'attivato', en: 'activated' },
  'common.deactivated': { it: 'disattivato', en: 'deactivated' },
  'common.started': { it: 'Claude Code avviato!', en: 'Claude Code launched!' },
  'common.terminated': { it: 'terminata', en: 'terminated' },
  'common.chatCleared': { it: 'Cronologia chat eliminata', en: 'Chat history cleared' },
  'common.recentCleared': { it: 'Avvii recenti eliminati', en: 'Recent launches cleared' },
} as const

export type TranslationKey = keyof typeof translations

export function t(key: TranslationKey, locale: Locale): string {
  return translations[key]?.[locale] ?? key
}

export default translations

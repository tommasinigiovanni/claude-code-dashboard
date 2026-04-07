import { useEffect, useRef, useCallback } from 'react'
import { Terminal } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import { WebLinksAddon } from '@xterm/addon-web-links'
import '@xterm/xterm/css/xterm.css'
import { terminalSpawn, terminalWrite, terminalResize, onTerminalOutput } from '@/services/api'
import { getSshConfig } from '@/hooks/useSshConfig'
import { Button } from '@/components/ui/button'

interface EmbeddedTerminalProps {
  projectPath?: string | null
  useTmux?: boolean
  tmuxAttachSession?: string | null
}

export function EmbeddedTerminal({ projectPath, useTmux, tmuxAttachSession }: EmbeddedTerminalProps) {
  const terminalRef = useRef<HTMLDivElement>(null)
  const xtermRef = useRef<Terminal | null>(null)
  const fitAddonRef = useRef<FitAddon | null>(null)
  const sessionIdRef = useRef<string | null>(null)
  const startedRef = useRef(false)

  const sendResize = useCallback(() => {
    const term = xtermRef.current
    const sid = sessionIdRef.current
    if (term && sid) {
      terminalResize(sid, term.rows, term.cols).catch(console.error)
    }
  }, [])

  const handleStart = useCallback(async () => {
    if (startedRef.current) return
    startedRef.current = true

    try {
      // Check for active SSH profile
      const sshConfig = getSshConfig()

      const id = await terminalSpawn({
        projectPath: projectPath ?? undefined,
        useTmux: useTmux ?? false,
        tmuxAttachSession: tmuxAttachSession ?? undefined,
        sshConfig,
      })
      sessionIdRef.current = id

      // Listen for output
      await onTerminalOutput(id, (data) => {
        xtermRef.current?.write(data)
      })

      // Send initial resize
      setTimeout(sendResize, 200)
    } catch (e) {
      xtermRef.current?.writeln(`\x1b[31mErrore: ${e}\x1b[0m\r\n`)
      startedRef.current = false
    }
  }, [projectPath, useTmux, tmuxAttachSession, sendResize])

  useEffect(() => {
    if (!terminalRef.current || xtermRef.current) return

    const terminal = new Terminal({
      theme: {
        background: '#1a1a2e',
        foreground: '#e0e0e0',
        cursor: '#c084fc',
        selectionBackground: '#c084fc40',
      },
      fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace",
      fontSize: 13,
      cursorBlink: true,
      scrollback: 10000,
    })

    const fitAddon = new FitAddon()
    terminal.loadAddon(fitAddon)
    terminal.loadAddon(new WebLinksAddon())

    terminal.open(terminalRef.current)
    fitAddon.fit()

    xtermRef.current = terminal
    fitAddonRef.current = fitAddon

    // Send user input to backend
    terminal.onData((data) => {
      const sid = sessionIdRef.current
      if (sid) {
        terminalWrite(sid, data).catch(console.error)
      }
    })

    // Resize PTY when terminal resizes
    terminal.onResize(({ rows, cols }) => {
      const sid = sessionIdRef.current
      if (sid) {
        terminalResize(sid, rows, cols).catch(console.error)
      }
    })

    const resizeObserver = new ResizeObserver(() => {
      fitAddon.fit()
    })
    resizeObserver.observe(terminalRef.current)

    // Auto-start
    handleStart()

    return () => {
      resizeObserver.disconnect()
      terminal.dispose()
      xtermRef.current = null
    }
  }, [handleStart])

  return (
    <div className="flex flex-col h-full">
      <div ref={terminalRef} className="flex-1 min-h-0 p-1" />
      {!startedRef.current && (
        <div className="flex items-center justify-center p-4">
          <Button onClick={handleStart}>▶ Avvia Claude Code</Button>
        </div>
      )}
    </div>
  )
}

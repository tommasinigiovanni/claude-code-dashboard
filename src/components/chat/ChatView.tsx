import { useState, useRef, useEffect, useCallback } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { listen } from '@tauri-apps/api/event'
import ReactMarkdown from 'react-markdown'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  images?: string[] // paths to attached images
  timestamp: Date
}

interface ChatStreamEvent {
  session_id: string
  event_type: string
  content: string
}

interface ChatViewProps {
  projectPath?: string | null
}

const CHAT_STORAGE_KEY = 'claude-dashboard-chat'

function loadChatHistory(projectPath: string | null | undefined): { messages: ChatMessage[]; sessionId: string | null } {
  try {
    const key = `${CHAT_STORAGE_KEY}-${projectPath ?? 'global'}`
    const stored = localStorage.getItem(key)
    if (stored) {
      const data = JSON.parse(stored)
      return {
        messages: (data.messages || []).map((m: ChatMessage) => ({ ...m, timestamp: new Date(m.timestamp) })),
        sessionId: data.sessionId || null,
      }
    }
  } catch { /* ignore */ }
  return { messages: [], sessionId: null }
}

const MAX_STORED_MESSAGES = 50

function saveChatHistory(projectPath: string | null | undefined, messages: ChatMessage[], sessionId: string | null) {
  try {
    const key = `${CHAT_STORAGE_KEY}-${projectPath ?? 'global'}`
    // Keep only last N messages to avoid localStorage bloat
    const trimmed = messages.slice(-MAX_STORED_MESSAGES)
    localStorage.setItem(key, JSON.stringify({ messages: trimmed, sessionId }))
  } catch {
    // localStorage full — clear old chat histories
    try {
      for (const k of Object.keys(localStorage)) {
        if (k.startsWith(CHAT_STORAGE_KEY)) {
          localStorage.removeItem(k)
        }
      }
    } catch { /* ignore */ }
  }
}

export function ChatView({ projectPath }: ChatViewProps) {
  const history = loadChatHistory(projectPath)
  const [messages, setMessages] = useState<ChatMessage[]>(history.messages)
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [sessionId, setSessionId] = useState<string | null>(history.sessionId)
  const [currentResponse, setCurrentResponse] = useState('')
  const [showThinking, setShowThinking] = useState(true)
  const [currentThinking, setCurrentThinking] = useState('')
  const [attachedImages, setAttachedImages] = useState<{ path: string; name: string }[]>([])
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages, currentResponse, scrollToBottom])

  // Persist chat history
  useEffect(() => {
    if (messages.length > 0 || sessionId) {
      saveChatHistory(projectPath, messages, sessionId)
    }
  }, [messages, sessionId, projectPath])

  const handleImageUpload = async (files: FileList | null) => {
    if (!files) return
    for (const file of Array.from(files)) {
      if (!file.type.startsWith('image/')) continue
      const buffer = await file.arrayBuffer()
      const ext = file.name.split('.').pop() || 'png'
      try {
        const path = await invoke<string>('save_temp_image', {
          data: Array.from(new Uint8Array(buffer)),
          extension: ext,
        })
        setAttachedImages((prev) => [...prev, { path, name: file.name }])
      } catch (e) {
        console.error('Failed to save image:', e)
      }
    }
  }

  const handlePaste = async (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items
    if (!items) return
    for (const item of Array.from(items)) {
      if (item.type.startsWith('image/')) {
        e.preventDefault()
        const file = item.getAsFile()
        if (file) {
          const buffer = await file.arrayBuffer()
          const ext = file.type.split('/')[1] || 'png'
          try {
            const path = await invoke<string>('save_temp_image', {
              data: Array.from(new Uint8Array(buffer)),
              extension: ext,
            })
            setAttachedImages((prev) => [...prev, { path, name: `screenshot.${ext}` }])
          } catch (e) {
            console.error('Failed to save pasted image:', e)
          }
        }
      }
    }
  }

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    await handleImageUpload(e.dataTransfer.files)
  }

  const handleSend = async () => {
    const msg = input.trim()
    if ((!msg && attachedImages.length === 0) || isLoading) return

    // Build message with image references
    let fullMessage = msg
    if (attachedImages.length > 0) {
      const imagePaths = attachedImages.map((img) => img.path).join('\n')
      fullMessage = `${msg}\n\n[Immagini allegate - leggi questi file immagine:]\n${imagePaths}`
    }

    setInput('')
    const images = attachedImages.map((i) => i.path)
    setAttachedImages([])
    setIsLoading(true)
    setCurrentResponse('')
    setCurrentThinking('')

    setMessages((prev) => [
      ...prev,
      { role: 'user', content: msg || 'Immagine allegata', images, timestamp: new Date() },
    ])

    try {
      const sid = await invoke<string>('chat_send_message', {
        message: fullMessage,
        sessionId: sessionId,
        projectPath: projectPath ?? undefined,
      })

      if (!sessionId) setSessionId(sid)

      const unlisten = await listen<ChatStreamEvent>(
        `chat-stream-${sid}`,
        (event) => {
          const { event_type, content } = event.payload
          switch (event_type) {
            case 'text':
              setCurrentResponse((prev) => prev + content)
              break
            case 'thinking':
              setCurrentThinking((prev) => prev + content)
              break
            case 'done':
              setMessages((prev) => [
                ...prev,
                { role: 'assistant', content: content || '', timestamp: new Date() },
              ])
              setCurrentResponse('')
              setCurrentThinking('')
              setIsLoading(false)
              unlisten()
              break
            case 'error':
              setMessages((prev) => [
                ...prev,
                { role: 'assistant', content: `Errore: ${content}`, timestamp: new Date() },
              ])
              setCurrentResponse('')
              setIsLoading(false)
              unlisten()
              break
          }
        }
      )
    } catch (e) {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: `Errore: ${e}`, timestamp: new Date() },
      ])
      setIsLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div
      className="flex flex-col h-full"
      onDrop={handleDrop}
      onDragOver={(e) => e.preventDefault()}
    >
      {/* Messages area */}
      <div className="flex-1 overflow-auto px-6 py-4 space-y-4">
        {messages.length === 0 && !isLoading && (
          <div className="flex flex-col items-center justify-center h-full text-center space-y-3">
            <span className="text-4xl">💬</span>
            <h3 className="text-lg font-semibold">Chat con Claude Code</h3>
            <p className="text-sm text-muted-foreground max-w-md">
              Scrivi un messaggio per iniziare. Puoi anche incollare o trascinare immagini.
            </p>
            {projectPath && (
              <p className="text-xs text-muted-foreground font-mono">{projectPath}</p>
            )}
          </div>
        )}

        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                msg.role === 'user'
                  ? 'bg-primary text-primary-foreground rounded-br-sm'
                  : 'bg-card border border-border rounded-bl-sm'
              }`}
            >
              {msg.images && msg.images.length > 0 && (
                <div className="flex gap-2 mb-2">
                  {msg.images.map((_img, j) => (
                    <div key={j} className="text-xs bg-muted/30 px-2 py-1 rounded">
                      📎 immagine
                    </div>
                  ))}
                </div>
              )}
              {msg.role === 'user' ? (
                <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
              ) : (
                <div className="text-sm prose prose-invert prose-sm max-w-none [&_p]:my-1 [&_ul]:my-1 [&_ol]:my-1 [&_li]:my-0.5 [&_pre]:my-2 [&_h1]:my-2 [&_h2]:my-2 [&_h3]:my-1">
                  <ReactMarkdown>{msg.content}</ReactMarkdown>
                </div>
              )}
            </div>
          </div>
        ))}

        {/* Streaming response */}
        {isLoading && (currentResponse || currentThinking) && (
          <div className="flex justify-start">
            <div className="max-w-[80%] rounded-2xl px-4 py-3 bg-card border border-border rounded-bl-sm">
              {currentThinking && showThinking && (
                <details open className="mb-2">
                  <summary className="text-xs text-muted-foreground cursor-pointer">
                    Ragionamento...
                  </summary>
                  <p className="text-xs text-muted-foreground mt-1 whitespace-pre-wrap">
                    {currentThinking.slice(-500)}
                  </p>
                </details>
              )}
              {currentResponse && (
                <div className="text-sm prose prose-invert prose-sm max-w-none">
                  <ReactMarkdown>{currentResponse}</ReactMarkdown>
                </div>
              )}
            </div>
          </div>
        )}

        {isLoading && !currentResponse && !currentThinking && (
          <div className="flex justify-start">
            <div className="rounded-2xl px-4 py-3 bg-card border border-border rounded-bl-sm">
              <div className="flex gap-1.5">
                <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Attached images preview */}
      {attachedImages.length > 0 && (
        <div className="px-6 py-2 border-t border-border flex gap-2 flex-wrap">
          {attachedImages.map((img, i) => (
            <div key={i} className="flex items-center gap-1 bg-muted rounded px-2 py-1 text-xs">
              📎 {img.name}
              <button
                onClick={() => setAttachedImages((prev) => prev.filter((_, j) => j !== i))}
                className="text-muted-foreground hover:text-foreground ml-1"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Input area */}
      <div className="border-t border-border px-6 py-4">
        <div className="flex gap-3 items-end">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={isLoading}
            title="Allega immagine"
          >
            📎
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => handleImageUpload(e.target.files)}
          />
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            placeholder="Scrivi un messaggio... (Cmd+V per incollare immagini)"
            rows={1}
            className="resize-none min-h-[44px] max-h-[200px] flex-1"
            disabled={isLoading}
          />
          <Button
            onClick={handleSend}
            disabled={(!input.trim() && attachedImages.length === 0) || isLoading}
            className="shrink-0"
          >
            Invia
          </Button>
        </div>
        <div className="flex items-center justify-between mt-2">
          <div className="flex items-center gap-3">
            <p className="text-xs text-muted-foreground">
              Shift+Enter per andare a capo · Trascina o incolla immagini
            </p>
            {messages.length > 0 && (
              <button
                onClick={() => {
                  setMessages([])
                  setSessionId(null)
                  setCurrentResponse('')
                  setCurrentThinking('')
                  saveChatHistory(projectPath, [], null)
                }}
                className="text-xs text-muted-foreground hover:text-foreground"
                disabled={isLoading}
              >
                Nuova conversazione
              </button>
            )}
          </div>
          <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer">
            <input
              type="checkbox"
              checked={showThinking}
              onChange={(e) => setShowThinking(e.target.checked)}
              className="rounded"
            />
            Mostra ragionamento
          </label>
        </div>
      </div>
    </div>
  )
}

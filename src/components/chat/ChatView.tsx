import { useState, useRef, useEffect, useCallback } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { listen } from '@tauri-apps/api/event'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { useI18n } from '@/i18n/useI18n'

interface ChatMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
  images?: string[]
  timestamp: Date
}

interface ChatEvent {
  session_id: string
  event_type: string
  content: string
}

interface ChatViewProps {
  projectPath?: string | null
}

const CHAT_STORAGE_KEY = 'claude-dashboard-chat'

function loadChatHistory(projectPath: string | null | undefined): ChatMessage[] {
  try {
    const key = `${CHAT_STORAGE_KEY}-${projectPath ?? 'global'}`
    const stored = localStorage.getItem(key)
    if (stored) {
      const data = JSON.parse(stored)
      return (data.messages || []).map((m: ChatMessage) => ({ ...m, timestamp: new Date(m.timestamp) }))
    }
  } catch { /* ignore */ }
  return []
}

function saveChatHistory(projectPath: string | null | undefined, messages: ChatMessage[]) {
  try {
    const key = `${CHAT_STORAGE_KEY}-${projectPath ?? 'global'}`
    const trimmed = messages.slice(-50)
    localStorage.setItem(key, JSON.stringify({ messages: trimmed }))
  } catch {
    try {
      for (const k of Object.keys(localStorage)) {
        if (k.startsWith(CHAT_STORAGE_KEY)) localStorage.removeItem(k)
      }
    } catch { /* ignore */ }
  }
}

export function ChatView({ projectPath }: ChatViewProps) {
  const { t } = useI18n()
  const [messages, setMessages] = useState<ChatMessage[]>(loadChatHistory(projectPath))
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [currentResponse, setCurrentResponse] = useState('')
  const [showThinking, setShowThinking] = useState(true)
  const [pendingPermission, setPendingPermission] = useState<string | null>(null)
  const [attachedImages, setAttachedImages] = useState<{ path: string; name: string }[]>([])
  const [ready, setReady] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages, currentResponse, pendingPermission, scrollToBottom])

  useEffect(() => {
    if (messages.length > 0) {
      saveChatHistory(projectPath, messages)
    }
  }, [messages, projectPath])

  // Start PTY session
  useEffect(() => {
    let unlisten: (() => void) | null = null

    const startSession = async () => {
      try {
        const sid = await invoke<string>('chat_start', {
          projectPath: projectPath ?? undefined,
        })
        setSessionId(sid)

        unlisten = await listen<ChatEvent>(`chat-event-${sid}`, (event) => {
          const { event_type, content } = event.payload

          switch (event_type) {
            case 'waiting':
              setReady(true)
              setIsLoading(false)
              setCurrentResponse('')
              break
            case 'text':
              setCurrentResponse(content)
              break
            case 'permission':
              setPendingPermission(content)
              setIsLoading(false)
              break
            case 'done': {
              // Clean up the response text - remove prompt characters
              const cleaned = content
                .split('\n')
                .filter(l => !l.trim().match(/^[>❯]\s*$/))
                .join('\n')
                .trim()
              if (cleaned) {
                setMessages((prev) => [
                  ...prev,
                  { role: 'assistant', content: cleaned, timestamp: new Date() },
                ])
              }
              setCurrentResponse('')
              setIsLoading(false)
              break
            }
            case 'error':
              setMessages((prev) => [
                ...prev,
                { role: 'system', content: `${t('common.error')}: ${content}`, timestamp: new Date() },
              ])
              setIsLoading(false)
              break
          }
        }) as unknown as () => void
      } catch (e) {
        setMessages((prev) => [
          ...prev,
          { role: 'system', content: `${t('common.error')}: ${e}`, timestamp: new Date() },
        ])
      }
    }

    startSession()

    return () => {
      if (unlisten) unlisten()
    }
  }, [projectPath, t])

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

  const handleSend = async () => {
    const msg = input.trim()
    if ((!msg && attachedImages.length === 0) || isLoading || !sessionId || !ready) return

    let fullMessage = msg
    if (attachedImages.length > 0) {
      const imagePaths = attachedImages.map((img) => img.path).join('\n')
      fullMessage = `${msg}\n\n[Images attached - read these image files:]\n${imagePaths}`
    }

    setInput('')
    const images = attachedImages.map((i) => i.path)
    setAttachedImages([])
    setIsLoading(true)
    setCurrentResponse('')

    setMessages((prev) => [
      ...prev,
      { role: 'user', content: msg || 'Image attached', images, timestamp: new Date() },
    ])

    try {
      await invoke('chat_send', { sessionId, message: fullMessage })
    } catch (e) {
      setMessages((prev) => [
        ...prev,
        { role: 'system', content: `${t('common.error')}: ${e}`, timestamp: new Date() },
      ])
      setIsLoading(false)
    }
  }

  const handleApprove = async (approved: boolean) => {
    if (!sessionId) return
    setPendingPermission(null)
    setIsLoading(true)

    setMessages((prev) => [
      ...prev,
      {
        role: 'system',
        content: approved ? '✅ Permesso concesso' : '❌ Permesso negato',
        timestamp: new Date(),
      },
    ])

    try {
      await invoke('chat_approve', { sessionId, approved })
    } catch (e) {
      console.error('Approve error:', e)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleNewConversation = () => {
    setMessages([])
    setSessionId(null)
    setCurrentResponse('')
    setPendingPermission(null)
    setReady(false)
    saveChatHistory(projectPath, [])
  }

  return (
    <div
      className="flex flex-col h-full"
      onDrop={async (e) => { e.preventDefault(); await handleImageUpload(e.dataTransfer.files) }}
      onDragOver={(e) => e.preventDefault()}
    >
      {/* Messages */}
      <div className="flex-1 overflow-auto px-6 py-4 space-y-4">
        {messages.length === 0 && !isLoading && (
          <div className="flex flex-col items-center justify-center h-full text-center space-y-3">
            <span className="text-4xl">💬</span>
            <h3 className="text-lg font-semibold">{t('chat.title')}</h3>
            <p className="text-sm text-muted-foreground max-w-md">{t('chat.welcome')}</p>
            {projectPath && <p className="text-xs text-muted-foreground font-mono">{projectPath}</p>}
            {!ready && sessionId && <p className="text-xs text-muted-foreground animate-pulse">Avvio Claude Code...</p>}
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] rounded-2xl px-4 py-3 ${
              msg.role === 'user'
                ? 'bg-primary text-primary-foreground rounded-br-sm'
                : msg.role === 'system'
                  ? 'bg-muted text-muted-foreground rounded-bl-sm text-xs'
                  : 'bg-card border border-border rounded-bl-sm'
            }`}>
              {msg.images && msg.images.length > 0 && (
                <div className="flex gap-2 mb-2">
                  {msg.images.map((_img, j) => (
                    <div key={j} className="text-xs bg-muted/30 px-2 py-1 rounded">📎 immagine</div>
                  ))}
                </div>
              )}
              {msg.role === 'user' ? (
                <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
              ) : msg.role === 'system' ? (
                <p className="whitespace-pre-wrap">{msg.content}</p>
              ) : (
                <div className="text-sm prose prose-invert prose-sm max-w-none [&_p]:my-1 [&_ul]:my-1 [&_ol]:my-1">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                </div>
              )}
            </div>
          </div>
        ))}

        {/* Streaming response */}
        {currentResponse && (
          <div className="flex justify-start">
            <div className="max-w-[80%] rounded-2xl px-4 py-3 bg-card border border-border rounded-bl-sm">
              <div className="text-sm prose prose-invert prose-sm max-w-none">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{currentResponse}</ReactMarkdown>
              </div>
            </div>
          </div>
        )}

        {/* Permission request */}
        {pendingPermission && (
          <div className="flex justify-start">
            <div className="max-w-[80%] rounded-2xl px-4 py-3 bg-amber-500/10 border border-amber-500/30 rounded-bl-sm space-y-3">
              <p className="text-sm font-medium text-amber-400">🔐 Richiesta permesso</p>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{pendingPermission}</p>
              <div className="flex gap-2">
                <Button size="sm" onClick={() => handleApprove(true)} className="bg-green-600 hover:bg-green-700">
                  ✅ Approva
                </Button>
                <Button size="sm" variant="outline" onClick={() => handleApprove(false)}>
                  ❌ Rifiuta
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Loading */}
        {isLoading && !currentResponse && !pendingPermission && (
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

      {/* Attached images */}
      {attachedImages.length > 0 && (
        <div className="px-6 py-2 border-t border-border flex gap-2 flex-wrap">
          {attachedImages.map((img, i) => (
            <div key={i} className="flex items-center gap-1 bg-muted rounded px-2 py-1 text-xs">
              📎 {img.name}
              <button onClick={() => setAttachedImages((prev) => prev.filter((_, j) => j !== i))} className="text-muted-foreground hover:text-foreground ml-1">×</button>
            </div>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="border-t border-border px-6 py-4">
        <div className="flex gap-3 items-end">
          <Button variant="ghost" size="sm" onClick={() => fileInputRef.current?.click()} disabled={isLoading || !ready} title="Allega immagine">📎</Button>
          <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => handleImageUpload(e.target.files)} />
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            placeholder={ready ? t('chat.placeholder') : 'Avvio Claude Code...'}
            rows={1}
            className="resize-none min-h-[44px] max-h-[200px] flex-1"
            disabled={isLoading || !ready || !!pendingPermission}
          />
          <Button onClick={handleSend} disabled={(!input.trim() && attachedImages.length === 0) || isLoading || !ready || !!pendingPermission} className="shrink-0">
            {t('chat.send')}
          </Button>
        </div>
        <div className="flex items-center justify-between mt-2">
          <div className="flex items-center gap-3">
            <p className="text-xs text-muted-foreground">{t('chat.shiftEnter')}</p>
            {messages.length > 0 && (
              <button onClick={handleNewConversation} className="text-xs text-muted-foreground hover:text-foreground" disabled={isLoading}>
                {t('chat.newConversation')}
              </button>
            )}
          </div>
          <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer">
            <input type="checkbox" checked={showThinking} onChange={(e) => setShowThinking(e.target.checked)} className="rounded" />
            {t('chat.showThinking')}
          </label>
        </div>
      </div>
    </div>
  )
}

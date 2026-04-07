import type {
  Transport,
  CommandName,
  CommandParams,
  CommandResult,
  EventName,
  EventMap,
  EventSubscription,
} from './types'

interface PendingCall {
  resolve: (value: unknown) => void
  reject: (reason: string) => void
}

export class WebSocketTransport implements Transport {
  private ws: WebSocket
  private pending = new Map<string, PendingCall>()
  private eventHandlers = new Map<string, Set<(payload: unknown) => void>>()
  private callId = 0
  private ready: Promise<void>

  constructor(url: string) {
    this.ws = new WebSocket(url)
    this.ready = new Promise((resolve, reject) => {
      this.ws.onopen = () => resolve()
      this.ws.onerror = () => reject(new Error('WebSocket connection failed'))
    })

    this.ws.onmessage = (event) => {
      const msg = JSON.parse(event.data)

      // Command response
      if (msg.id !== undefined) {
        const pending = this.pending.get(msg.id)
        if (pending) {
          if (msg.error) {
            pending.reject(msg.error)
          } else {
            pending.resolve(msg.result)
          }
          this.pending.delete(msg.id)
        }
        return
      }

      // Event push
      if (msg.type === 'event') {
        const handlers = this.eventHandlers.get(msg.channel)
        if (handlers) {
          let payload: unknown
          try {
            payload = JSON.parse(msg.payload)
          } catch {
            payload = msg.payload
          }
          handlers.forEach((h) => h(payload))
        }
      }
    }

    this.ws.onclose = () => {
      for (const [, pending] of this.pending) {
        pending.reject('WebSocket closed')
      }
      this.pending.clear()
    }
  }

  async call<C extends CommandName>(
    command: C,
    ...args: CommandParams<C> extends void ? [] : [CommandParams<C>]
  ): Promise<CommandResult<C>> {
    await this.ready
    const id = String(++this.callId)
    const params = args[0] ?? {}

    return new Promise<CommandResult<C>>((resolve, reject) => {
      this.pending.set(id, {
        resolve: resolve as (value: unknown) => void,
        reject,
      })
      this.ws.send(JSON.stringify({ id, command, params }))
    })
  }

  async subscribe<E extends EventName>(
    event: E,
    channelId: string,
    handler: (payload: EventMap[E]) => void,
  ): Promise<EventSubscription> {
    await this.ready
    const channel = `${event}-${channelId}`

    if (!this.eventHandlers.has(channel)) {
      this.eventHandlers.set(channel, new Set())
      this.ws.send(JSON.stringify({ type: 'subscribe', channel }))
    }

    const handlers = this.eventHandlers.get(channel)!
    const wrappedHandler = handler as (payload: unknown) => void
    handlers.add(wrappedHandler)

    return {
      unsubscribe: () => {
        handlers.delete(wrappedHandler)
        if (handlers.size === 0) {
          if (this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({ type: 'unsubscribe', channel }))
          }
          this.eventHandlers.delete(channel)
        }
      },
    }
  }

  destroy(): void {
    this.ws.close()
    this.pending.clear()
    this.eventHandlers.clear()
  }
}

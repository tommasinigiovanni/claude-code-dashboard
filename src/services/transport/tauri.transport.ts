import { invoke } from '@tauri-apps/api/core'
import { listen, type UnlistenFn } from '@tauri-apps/api/event'
import type {
  Transport,
  CommandName,
  CommandParams,
  CommandResult,
  EventName,
  EventMap,
  EventSubscription,
} from './types'

export class TauriTransport implements Transport {
  private unlisteners: UnlistenFn[] = []

  async call<C extends CommandName>(
    command: C,
    ...args: CommandParams<C> extends void ? [] : [CommandParams<C>]
  ): Promise<CommandResult<C>> {
    const params = args[0]
    if (params === undefined) {
      return invoke<CommandResult<C>>(command)
    }
    return invoke<CommandResult<C>>(command, params as Record<string, unknown>)
  }

  async subscribe<E extends EventName>(
    event: E,
    channelId: string,
    handler: (payload: EventMap[E]) => void,
  ): Promise<EventSubscription> {
    const fullEventName = `${event}-${channelId}`
    const unlisten = await listen<EventMap[E]>(fullEventName, (e) => {
      handler(e.payload)
    })
    this.unlisteners.push(unlisten)
    return {
      unsubscribe: () => {
        unlisten()
        this.unlisteners = this.unlisteners.filter((u) => u !== unlisten)
      },
    }
  }

  destroy(): void {
    for (const unlisten of this.unlisteners) {
      unlisten()
    }
    this.unlisteners = []
  }
}

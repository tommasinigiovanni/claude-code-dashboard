import { getTransport } from '../transport'
import type { TelegramBotStatus } from '../transport'

const transport = () => getTransport()

export async function telegramBotStatus(): Promise<TelegramBotStatus> {
  return transport().call('telegram_bot_status')
}

export async function telegramStartBot(opts: {
  botToken: string
  allowedChatId: number | null
  projectPath: string | null
  autoApprove: boolean
}): Promise<TelegramBotStatus> {
  return transport().call('telegram_start_bot', opts)
}

export async function telegramStopBot(): Promise<void> {
  return transport().call('telegram_stop_bot')
}

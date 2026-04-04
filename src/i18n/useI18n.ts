import { useCallback } from 'react'
import { t, type TranslationKey, type Locale } from './translations'
import { getSettings } from '@/pages/SettingsPage'

export function useI18n() {
  const locale = (getSettings().language ?? 'it') as Locale

  const tr = useCallback(
    (key: TranslationKey) => t(key, locale),
    [locale]
  )

  return { t: tr, locale }
}

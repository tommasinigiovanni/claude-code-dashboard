import { create } from 'zustand'

export type Page = 'mcp' | 'skills' | 'subagents' | 'hooks' | 'usage' | 'claudemd' | 'launcher' | 'settings' | 'docs' | 'credits' | 'profiles' | 'logs' | 'health' | 'changelog' | 'verification' | 'learning'

interface UiState {
  activePage: Page
  setActivePage: (page: Page) => void
}

export const useUiStore = create<UiState>((set) => ({
  activePage: 'mcp',
  setActivePage: (activePage) => set({ activePage }),
}))

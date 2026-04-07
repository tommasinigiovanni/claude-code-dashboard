import { useState } from 'react'
import { checkClaudeInstalled } from '@/services/api'
import { Button } from '@/components/ui/button'
import { useI18n } from '@/i18n/useI18n'
import { useUiStore } from '@/store/uiStore'
import { getSettings, type DashboardSettings } from '@/pages/SettingsPage'

const ONBOARDING_KEY = 'claude-dashboard-onboarding-done'

export function useOnboarding() {
  const done = localStorage.getItem(ONBOARDING_KEY) === 'true'
  const markDone = () => localStorage.setItem(ONBOARDING_KEY, 'true')
  return { showOnboarding: !done, markDone }
}

interface Step {
  titleIt: string
  titleEn: string
  descIt: string
  descEn: string
  icon: string
  action?: () => void
}

export function OnboardingWizard({ onComplete }: { onComplete: () => void }) {
  const { locale } = useI18n()
  const isIt = locale === 'it'
  const [step, setStep] = useState(0)
  const [claudeInstalled, setClaudeInstalled] = useState<boolean | null>(null)
  const setActivePage = useUiStore((s) => s.setActivePage)

  const steps: Step[] = [
    {
      icon: '👋',
      titleIt: 'Benvenuto in Claude Code Dashboard!',
      titleEn: 'Welcome to Claude Code Dashboard!',
      descIt: 'Questa app ti permette di gestire il tuo ambiente Claude Code in modo visuale: MCP servers, Skills, Plugins, Sub-agents e molto altro.',
      descEn: 'This app lets you manage your Claude Code environment visually: MCP servers, Skills, Plugins, Sub-agents and much more.',
    },
    {
      icon: '🔍',
      titleIt: 'Verifica Claude Code',
      titleEn: 'Check Claude Code',
      descIt: 'Verifichiamo che Claude Code sia installato sul tuo sistema...',
      descEn: 'Let\'s check that Claude Code is installed on your system...',
      action: () => {
        checkClaudeInstalled()
          .then(setClaudeInstalled)
          .catch(() => setClaudeInstalled(false))
      },
    },
    {
      icon: '🎨',
      titleIt: 'Scegli la tua modalità',
      titleEn: 'Choose your mode',
      descIt: 'Come vuoi interagire con Claude Code?\n\n💬 Chat — interfaccia semplice, ideale per chi non usa il terminale\n🖥️ Terminale — accesso diretto, per sviluppatori\n\nPuoi cambiare in qualsiasi momento nelle Impostazioni.',
      descEn: 'How do you want to interact with Claude Code?\n\n💬 Chat — simple interface, ideal for non-terminal users\n🖥️ Terminal — direct access, for developers\n\nYou can change anytime in Settings.',
    },
    {
      icon: '🚀',
      titleIt: 'Tutto pronto!',
      titleEn: 'All set!',
      descIt: 'Sei pronto per iniziare. Esplora il menu laterale per scoprire tutte le funzionalità, o vai direttamente al Launcher per avviare Claude Code.',
      descEn: 'You\'re ready to go. Explore the sidebar menu to discover all features, or go directly to the Launcher to start Claude Code.',
    },
  ]

  const currentStep = steps[step]

  const handleModeSelect = (mode: 'chat' | 'embedded') => {
    const settings: DashboardSettings = { ...getSettings(), terminalApp: mode }
    localStorage.setItem('claude-dashboard-settings', JSON.stringify(settings))
  }

  const handleNext = () => {
    if (step < steps.length - 1) {
      setStep(step + 1)
      steps[step + 1]?.action?.()
    } else {
      onComplete()
      setActivePage('launcher')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 backdrop-blur-sm">
      <div className="max-w-lg w-full mx-4 space-y-6">
        {/* Progress */}
        <div className="flex gap-2 justify-center">
          {steps.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 w-12 rounded-full transition-colors ${
                i <= step ? 'bg-primary' : 'bg-muted'
              }`}
            />
          ))}
        </div>

        {/* Content */}
        <div className="rounded-2xl border border-border bg-card p-8 text-center space-y-4">
          <span className="text-5xl">{currentStep.icon}</span>
          <h2 className="text-2xl font-bold">
            {isIt ? currentStep.titleIt : currentStep.titleEn}
          </h2>
          <p className="text-muted-foreground whitespace-pre-line">
            {isIt ? currentStep.descIt : currentStep.descEn}
          </p>

          {/* Step 1: Claude check result */}
          {step === 1 && claudeInstalled !== null && (
            <div className={`rounded-lg p-4 ${claudeInstalled ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
              {claudeInstalled
                ? (isIt ? '✅ Claude Code è installato!' : '✅ Claude Code is installed!')
                : (isIt ? '❌ Claude Code non trovato. Installa con: npm install -g @anthropic-ai/claude-code' : '❌ Claude Code not found. Install with: npm install -g @anthropic-ai/claude-code')}
            </div>
          )}

          {/* Step 2: Mode selection */}
          {step === 2 && (
            <div className="flex gap-4 justify-center pt-2">
              <Button
                size="lg"
                variant="outline"
                className="flex-1 h-20 flex-col gap-1"
                onClick={() => handleModeSelect('chat')}
              >
                <span className="text-2xl">💬</span>
                <span className="text-xs">Chat</span>
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="flex-1 h-20 flex-col gap-1"
                onClick={() => handleModeSelect('embedded')}
              >
                <span className="text-2xl">🖥️</span>
                <span className="text-xs">{isIt ? 'Terminale' : 'Terminal'}</span>
              </Button>
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="flex justify-between">
          <Button
            variant="ghost"
            onClick={() => { onComplete() }}
            className="text-muted-foreground"
          >
            {isIt ? 'Salta' : 'Skip'}
          </Button>
          <Button onClick={handleNext}>
            {step === steps.length - 1
              ? (isIt ? 'Inizia!' : 'Get started!')
              : (isIt ? 'Avanti' : 'Next')}
          </Button>
        </div>
      </div>
    </div>
  )
}

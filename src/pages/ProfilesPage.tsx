import { useState, useEffect } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import { useI18n } from '@/i18n/useI18n'

interface Profile {
  name: string
  description: string
  created_at: string
}

export function ProfilesPage() {
  const { t, locale } = useI18n()
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [saveDialogOpen, setSaveDialogOpen] = useState(false)
  const [newName, setNewName] = useState('')
  const [newDescription, setNewDescription] = useState('')
  const [saving, setSaving] = useState(false)

  const loadProfiles = async () => {
    setLoading(true)
    try {
      const result = await invoke<Profile[]>('list_profiles')
      setProfiles(result)
    } catch (e) {
      toast.error(`${t('common.error')}: ${e}`)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadProfiles()
  }, [])

  const handleSave = async () => {
    if (!newName.trim()) return
    setSaving(true)
    try {
      await invoke('save_profile', { name: newName.trim(), description: newDescription.trim() })
      toast.success(locale === 'it' ? 'Profilo salvato' : 'Profile saved')
      setSaveDialogOpen(false)
      setNewName('')
      setNewDescription('')
      loadProfiles()
    } catch (e) {
      toast.error(`${t('common.error')}: ${e}`)
    } finally {
      setSaving(false)
    }
  }

  const handleLoad = async (name: string) => {
    const msg = locale === 'it'
      ? `Caricare il profilo "${name}"? La configurazione attuale verra' sovrascritta.`
      : `Load profile "${name}"? Current configuration will be overwritten.`
    if (!window.confirm(msg)) return
    try {
      await invoke('load_profile', { name })
      toast.success(locale === 'it' ? 'Profilo caricato' : 'Profile loaded')
    } catch (e) {
      toast.error(`${t('common.error')}: ${e}`)
    }
  }

  const handleDelete = async (name: string) => {
    const msg = locale === 'it'
      ? `Eliminare il profilo "${name}"?`
      : `Delete profile "${name}"?`
    if (!window.confirm(msg)) return
    try {
      await invoke('delete_profile', { name })
      toast.success(`${name} ${t('common.removed')}`)
      loadProfiles()
    } catch (e) {
      toast.error(`${t('common.error')}: ${e}`)
    }
  }

  return (
    <div className="p-6 max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">{t('nav.profiles')}</h2>
        <Button onClick={() => setSaveDialogOpen(true)}>
          {locale === 'it' ? '+ Salva configurazione attuale' : '+ Save current config'}
        </Button>
      </div>

      <p className="text-sm text-muted-foreground mb-6">
        {locale === 'it'
          ? 'Salva e carica profili di configurazione per passare rapidamente tra diversi setup.'
          : 'Save and load configuration profiles to quickly switch between different setups.'}
      </p>

      {loading ? (
        <p className="text-muted-foreground">{t('common.loading')}</p>
      ) : profiles.length === 0 ? (
        <p className="text-muted-foreground">
          {locale === 'it' ? 'Nessun profilo salvato.' : 'No saved profiles.'}
        </p>
      ) : (
        <div className="space-y-3">
          {profiles.map((profile) => (
            <div
              key={profile.name}
              className="rounded-lg border border-border p-4 flex items-start justify-between gap-4"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium">{profile.name}</span>
                  <Badge variant="secondary" className="text-xs">
                    {new Date(profile.created_at).toLocaleDateString(locale)}
                  </Badge>
                </div>
                {profile.description && (
                  <p className="text-sm text-muted-foreground">{profile.description}</p>
                )}
              </div>
              <div className="flex gap-2 shrink-0">
                <Button variant="outline" size="sm" onClick={() => handleLoad(profile.name)}>
                  {locale === 'it' ? 'Carica' : 'Load'}
                </Button>
                <Button variant="outline" size="sm" onClick={() => handleDelete(profile.name)}>
                  {locale === 'it' ? 'Elimina' : 'Delete'}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {locale === 'it' ? 'Salva profilo' : 'Save profile'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>{locale === 'it' ? 'Nome' : 'Name'}</Label>
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder={locale === 'it' ? 'es. produzione' : 'e.g. production'}
              />
            </div>
            <div className="space-y-2">
              <Label>{locale === 'it' ? 'Descrizione' : 'Description'}</Label>
              <Textarea
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                placeholder={locale === 'it' ? 'Descrizione opzionale...' : 'Optional description...'}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSaveDialogOpen(false)}>
              {locale === 'it' ? 'Annulla' : 'Cancel'}
            </Button>
            <Button onClick={handleSave} disabled={saving || !newName.trim()}>
              {saving ? '...' : locale === 'it' ? 'Salva' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

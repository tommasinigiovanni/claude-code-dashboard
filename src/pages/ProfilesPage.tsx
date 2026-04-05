import { useState, useEffect } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

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
import {
  UserCircleIcon, CalendarIcon, UploadIcon, TrashIcon,
  FolderOpenIcon, AlertTriangleIcon,
} from 'lucide-react'

interface Profile {
  name: string
  description: string
  created_at: string
}

function formatRelativeDate(dateStr: string, locale: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays === 0) return locale === 'it' ? 'Oggi' : 'Today'
  if (diffDays === 1) return locale === 'it' ? 'Ieri' : 'Yesterday'
  if (diffDays < 7) return locale === 'it' ? `${diffDays} giorni fa` : `${diffDays} days ago`
  return date.toLocaleDateString(locale)
}

export function ProfilesPage() {
  const { t, locale } = useI18n()
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [saveDialogOpen, setSaveDialogOpen] = useState(false)
  const [confirmDialog, setConfirmDialog] = useState<{ type: 'load' | 'delete'; name: string } | null>(null)
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
      toast.success(t('profiles.saved'))
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
    try {
      await invoke('load_profile', { name })
      toast.success(t('profiles.loaded'))
      setConfirmDialog(null)
    } catch (e) {
      toast.error(`${t('common.error')}: ${e}`)
    }
  }

  const handleDelete = async (name: string) => {
    try {
      await invoke('delete_profile', { name })
      toast.success(`${name} ${t('common.removed')}`)
      setConfirmDialog(null)
      loadProfiles()
    } catch (e) {
      toast.error(`${t('common.error')}: ${e}`)
    }
  }

  return (
    <div className="p-6 space-y-4 max-w-3xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">{t('profiles.title')}</h2>
        <Button onClick={() => setSaveDialogOpen(true)}>
          {t('profiles.saveCurrentConfig')}
        </Button>
      </div>

      <p className="text-sm text-muted-foreground">
        {t('profiles.description')}
      </p>

      {loading ? (
        <p className="text-muted-foreground">{t('common.loading')}</p>
      ) : profiles.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-14 h-14 rounded-2xl bg-muted/50 flex items-center justify-center mb-4">
            <FolderOpenIcon className="size-7 text-muted-foreground/60" />
          </div>
          <p className="text-sm font-medium mb-1">{t('profiles.emptyTitle')}</p>
          <p className="text-xs text-muted-foreground max-w-xs">{t('profiles.emptyDesc')}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {profiles.map((profile) => (
            <div
              key={profile.name}
              className="rounded-xl border border-border bg-card p-4 flex items-start justify-between gap-4"
            >
              <div className="flex gap-3 flex-1 min-w-0">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0 mt-0.5">
                  <UserCircleIcon className="size-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="font-semibold">{profile.name}</span>
                  </div>
                  {profile.description && (
                    <p className="text-sm text-muted-foreground mb-1.5">{profile.description}</p>
                  )}
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <CalendarIcon className="size-3" />
                    <span>{formatRelativeDate(profile.created_at, locale)}</span>
                    <span className="mx-1">·</span>
                    <span>{new Date(profile.created_at).toLocaleDateString(locale)}</span>
                  </div>
                </div>
              </div>
              <div className="flex gap-2 shrink-0">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setConfirmDialog({ type: 'load', name: profile.name })}
                >
                  <UploadIcon className="size-3.5 mr-1.5" />
                  {t('profiles.load')}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setConfirmDialog({ type: 'delete', name: profile.name })}
                >
                  <TrashIcon className="size-3.5 mr-1.5 text-destructive" />
                  {t('profiles.delete')}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Save dialog */}
      <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('profiles.saveDialog')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>{t('mcp.name')}</Label>
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder={t('profiles.namePlaceholder')}
              />
            </div>
            <div className="space-y-2">
              <Label>{t('agents.description')}</Label>
              <Textarea
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                placeholder={t('profiles.descPlaceholder')}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSaveDialogOpen(false)}>
              {t('profiles.cancel')}
            </Button>
            <Button onClick={handleSave} disabled={saving || !newName.trim()}>
              {saving ? '...' : t('mcp.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm dialog */}
      <Dialog open={!!confirmDialog} onOpenChange={() => setConfirmDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangleIcon className="size-5 text-amber-500" />
              {confirmDialog?.type === 'load' ? t('profiles.load') : t('profiles.delete')}
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground py-2">
            {confirmDialog?.type === 'load'
              ? t('profiles.confirmLoad').replace('{name}', confirmDialog?.name ?? '')
              : t('profiles.confirmDelete').replace('{name}', confirmDialog?.name ?? '')}
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDialog(null)}>
              {t('profiles.cancel')}
            </Button>
            <Button
              variant={confirmDialog?.type === 'delete' ? 'destructive' : 'default'}
              onClick={() => {
                if (!confirmDialog) return
                if (confirmDialog.type === 'load') handleLoad(confirmDialog.name)
                else handleDelete(confirmDialog.name)
              }}
            >
              {confirmDialog?.type === 'load' ? t('profiles.load') : t('profiles.delete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

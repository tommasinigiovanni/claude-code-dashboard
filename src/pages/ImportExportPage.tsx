import { useState } from 'react'
import { exportConfig, importConfig } from '@/services/api'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import { useI18n } from '@/i18n/useI18n'

export function ImportExportPage() {
  const { t, locale } = useI18n()
  const [importDialogOpen, setImportDialogOpen] = useState(false)
  const [importJson, setImportJson] = useState('')
  const [importing, setImporting] = useState(false)
  const [exporting, setExporting] = useState(false)

  const handleExport = async () => {
    setExporting(true)
    try {
      const json = await exportConfig()
      await navigator.clipboard.writeText(json)
      toast.success(locale === 'it' ? 'Configurazione copiata negli appunti' : 'Configuration copied to clipboard')
    } catch (e) {
      toast.error(`${t('common.error')}: ${e}`)
    } finally {
      setExporting(false)
    }
  }

  const handleExportDownload = async () => {
    setExporting(true)
    try {
      const json = await exportConfig()
      const blob = new Blob([json], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'claude-config-export.json'
      a.click()
      URL.revokeObjectURL(url)
      toast.success(locale === 'it' ? 'Configurazione esportata' : 'Configuration exported')
    } catch (e) {
      toast.error(`${t('common.error')}: ${e}`)
    } finally {
      setExporting(false)
    }
  }

  const handleImport = async () => {
    if (!importJson.trim()) return
    setImporting(true)
    try {
      const result = await importConfig(importJson.trim())
      toast.success(result || (locale === 'it' ? 'Configurazione importata' : 'Configuration imported'))
      setImportDialogOpen(false)
      setImportJson('')
    } catch (e) {
      toast.error(`${t('common.error')}: ${e}`)
    } finally {
      setImporting(false)
    }
  }

  return (
    <div className="space-y-3">
      <Label>{locale === 'it' ? 'Importa / Esporta configurazione' : 'Import / Export configuration'}</Label>
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" onClick={handleExport} disabled={exporting}>
          {locale === 'it' ? 'Copia config negli appunti' : 'Copy config to clipboard'}
        </Button>
        <Button variant="outline" size="sm" onClick={handleExportDownload} disabled={exporting}>
          {locale === 'it' ? 'Scarica config' : 'Download config'}
        </Button>
        <Button variant="outline" size="sm" onClick={() => setImportDialogOpen(true)}>
          {locale === 'it' ? 'Importa config' : 'Import config'}
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        {locale === 'it'
          ? 'Esporta la configurazione Claude Code attuale o importa da un JSON.'
          : 'Export the current Claude Code configuration or import from JSON.'}
      </p>

      <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {locale === 'it' ? 'Importa configurazione' : 'Import configuration'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>{locale === 'it' ? 'Incolla il JSON della configurazione' : 'Paste configuration JSON'}</Label>
              <Textarea
                value={importJson}
                onChange={(e) => setImportJson(e.target.value)}
                placeholder='{"mcpServers": {...}, ...}'
                rows={10}
                className="font-mono text-xs"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setImportDialogOpen(false)}>
              {locale === 'it' ? 'Annulla' : 'Cancel'}
            </Button>
            <Button onClick={handleImport} disabled={importing || !importJson.trim()}>
              {importing ? '...' : locale === 'it' ? 'Importa' : 'Import'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

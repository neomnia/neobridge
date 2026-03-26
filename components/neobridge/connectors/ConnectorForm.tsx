'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Plus } from 'lucide-react'

const CONNECTOR_TYPES = [
  { value: 'vercel',   label: 'Vercel',       fields: [{ key: 'projectId', label: 'Project ID' }, { key: 'teamId', label: 'Team ID' }, { key: 'token', label: 'Token', secret: true }] },
  { value: 'github',   label: 'GitHub',       fields: [{ key: 'owner', label: 'Owner' }, { key: 'repo', label: 'Repo' }, { key: 'token', label: 'Token', secret: true }, { key: 'branch', label: 'Branch' }] },
  { value: 'zoho',     label: 'Zoho Projects', fields: [{ key: 'portalId', label: 'Portal ID' }, { key: 'projectId', label: 'Project ID' }, { key: 'refreshToken', label: 'Refresh Token', secret: true }] },
  { value: 'railway',  label: 'Railway',       fields: [{ key: 'projectId', label: 'Project ID' }, { key: 'serviceId', label: 'Service ID' }, { key: 'token', label: 'Token', secret: true }] },
  { value: 'scaleway', label: 'Scaleway',      fields: [{ key: 'projectId', label: 'Project ID' }, { key: 'region', label: 'Region' }, { key: 'token', label: 'Token', secret: true }] },
  { value: 'temporal', label: 'Temporal',      fields: [{ key: 'namespace', label: 'Namespace' }, { key: 'address', label: 'Address' }] },
  { value: 'notion',   label: 'Notion',        fields: [{ key: 'token', label: 'Integration Token', secret: true }] },
] as const

type ConnectorTypeValue = typeof CONNECTOR_TYPES[number]['value']

interface ConnectorFormProps {
  projectId: string
  onCreated: () => void
}

export function ConnectorForm({ projectId, onCreated }: ConnectorFormProps) {
  const [open, setOpen] = useState(false)
  const [type, setType] = useState<ConnectorTypeValue>('vercel')
  const [label, setLabel] = useState('')
  const [fields, setFields] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const connectorType = CONNECTOR_TYPES.find(c => c.value === type)!

  const submit = async () => {
    if (!label.trim()) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/projects/${projectId}/connectors`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, label, config: fields }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      setOpen(false)
      setLabel('')
      setFields({})
      onCreated()
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-1.5">
          <Plus className="h-4 w-4" />
          Ajouter un connecteur
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Nouveau connecteur</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Type</label>
            <Select value={type} onValueChange={(v) => { setType(v as ConnectorTypeValue); setFields({}) }}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {CONNECTOR_TYPES.map(c => (
                  <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">Nom affiché</label>
            <Input value={label} onChange={e => setLabel(e.target.value)} placeholder="ex: Prod — neobridge" />
          </div>

          {connectorType.fields.map(f => (
            <div key={f.key} className="space-y-1.5">
              <label className="text-sm font-medium">{f.label}</label>
              <Input
                type={'secret' in f && f.secret ? 'password' : 'text'}
                value={fields[f.key] ?? ''}
                onChange={e => setFields(prev => ({ ...prev, [f.key]: e.target.value }))}
              />
            </div>
          ))}

          {error && <p className="text-sm text-destructive">{error}</p>}

          <Button className="w-full" onClick={submit} disabled={loading || !label.trim()}>
            {loading ? 'Création…' : 'Créer le connecteur'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

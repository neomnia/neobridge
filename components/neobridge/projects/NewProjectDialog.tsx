'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Plus } from 'lucide-react'

export function NewProjectDialog() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [stack, setStack] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          description: description || null,
          stack: stack ? stack.split(',').map(s => s.trim()).filter(Boolean) : [],
        }),
      })
      if (res.ok) {
        const project = await res.json()
        setOpen(false)
        router.push(`/dashboard/${project.id}`)
        router.refresh()
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Nouveau projet
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Créer un projet</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <Label htmlFor="name">Nom *</Label>
            <Input id="name" value={name} onChange={e => setName(e.target.value)} required placeholder="NeoBridge v2" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="desc">Objectif</Label>
            <Textarea id="desc" value={description} onChange={e => setDescription(e.target.value)} placeholder="Plateforme de gestion de projet..." rows={2} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="stack">Stack (séparés par virgule)</Label>
            <Input id="stack" value={stack} onChange={e => setStack(e.target.value)} placeholder="Next.js, Neon, Temporal, Claude Code" />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
            <Button type="submit" disabled={loading || !name}>{loading ? 'Création...' : 'Créer'}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

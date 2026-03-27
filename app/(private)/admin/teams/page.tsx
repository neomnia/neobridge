'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Plus, Pencil, Trash2, Users } from 'lucide-react'

type Plan = 'free' | 'pro' | 'enterprise'

interface Team {
  id: string
  name: string
  slug: string
  plan: Plan
  memberCount: number
}

const PLAN_VARIANT: Record<Plan, 'default' | 'secondary' | 'outline'> = {
  free:       'outline',
  pro:        'default',
  enterprise: 'secondary',
}

const PLAN_LABEL: Record<Plan, string> = {
  free:       'Free',
  pro:        'Pro',
  enterprise: 'Enterprise',
}

function slugify(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

// Mock data — remplacé par fetch GET /api/teams dès que l'API est disponible
const MOCK_TEAMS: Team[] = [
  { id: '1', name: 'Agence Neomnia', slug: 'neomnia',    plan: 'pro',        memberCount: 4 },
  { id: '2', name: 'Client Demo',    slug: 'client-demo', plan: 'free',       memberCount: 1 },
  { id: '3', name: 'Enterprise Co',  slug: 'enterprise',  plan: 'enterprise', memberCount: 12 },
]

export default function AdminTeamsPage() {
  const [teams, setTeams] = useState<Team[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)

  // Form state
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [plan, setPlan] = useState<Plan>('free')
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/teams')
      if (res.ok) {
        const data: Team[] = await res.json()
        setTeams(Array.isArray(data) && data.length > 0 ? data : MOCK_TEAMS)
      } else {
        setTeams(MOCK_TEAMS)
      }
    } catch {
      setTeams(MOCK_TEAMS)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const handleNameChange = (value: string) => {
    setName(value)
    setSlug(slugify(value))
  }

  const handleCreate = async () => {
    if (!name.trim()) return
    setSaving(true)
    try {
      const res = await fetch('/api/teams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), slug, plan }),
      })
      if (res.ok) {
        await load()
        setDialogOpen(false)
        setName('')
        setSlug('')
        setPlan('free')
      }
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer cette team ?')) return
    try {
      await fetch(`/api/teams/${id}`, { method: 'DELETE' })
      setTeams((prev) => prev.filter((t) => t.id !== id))
    } catch {
      // ignore
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Gestion des Teams</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {teams.length} team{teams.length !== 1 ? 's' : ''} enregistrée{teams.length !== 1 ? 's' : ''}
          </p>
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Créer une Team
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Nouvelle Team</DialogTitle>
              <DialogDescription>
                Créez un nouvel espace de travail pour votre organisation
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label htmlFor="team-name">Nom</Label>
                <Input
                  id="team-name"
                  placeholder="Ex : Agence Neomnia"
                  value={name}
                  onChange={(e) => handleNameChange(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="team-slug">Slug</Label>
                <Input
                  id="team-slug"
                  placeholder="ex : agence-neomnia"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  URL : /dashboard/{slug || 'slug'}
                </p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="team-plan">Plan</Label>
                <Select value={plan} onValueChange={(v) => setPlan(v as Plan)}>
                  <SelectTrigger id="team-plan">
                    <SelectValue placeholder="Choisir un plan" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="free">Free</SelectItem>
                    <SelectItem value="pro">Pro</SelectItem>
                    <SelectItem value="enterprise">Enterprise</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Annuler
              </Button>
              <Button onClick={handleCreate} disabled={saving || !name.trim()}>
                {saving ? 'Création…' : 'Créer'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-5 w-5" />
            Teams
          </CardTitle>
          <CardDescription>
            Toutes les équipes et espaces de travail de la plateforme
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-12 text-center text-muted-foreground text-sm">
              Chargement…
            </div>
          ) : teams.length === 0 ? (
            <div className="flex flex-col items-center justify-center border border-dashed rounded-lg py-16 text-center">
              <p className="text-muted-foreground font-medium">Aucune team</p>
              <p className="text-sm text-muted-foreground mt-1">
                Créez la première team pour commencer
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nom</TableHead>
                  <TableHead>Slug</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead className="text-center">Membres</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {teams.map((team) => (
                  <TableRow key={team.id}>
                    <TableCell className="font-medium">{team.name}</TableCell>
                    <TableCell className="text-muted-foreground font-mono text-sm">
                      {team.slug}
                    </TableCell>
                    <TableCell>
                      <Badge variant={PLAN_VARIANT[team.plan] ?? 'outline'}>
                        {PLAN_LABEL[team.plan] ?? team.plan}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">{team.memberCount ?? 0}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          title="Modifier"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                          title="Supprimer"
                          onClick={() => handleDelete(team.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

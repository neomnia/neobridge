"use client"

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Sparkles, Rocket, Database, GitBranch, FolderKanban, Workflow } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'

interface VercelTeamSummary {
  id: string
  slug: string
  name: string
}

interface VercelProjectSummary {
  id: string
  name: string
  teamId?: string | null
  teamSlug?: string | null
  framework?: string | null
}

export function CreateProjectForm({ teamId }: { teamId: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [vercelTeams, setVercelTeams] = useState<VercelTeamSummary[]>([])
  const [vercelProjects, setVercelProjects] = useState<VercelProjectSummary[]>([])
  const [form, setForm] = useState({
    name: '',
    description: '',
    template: 'neosaas-official',
    vercelMode: 'link-existing',
    selectedVercelTeamId: '',
    selectedVercelProjectId: '',
    connectNeon: true,
    createGithubRepo: true,
    createZohoProject: true,
    enableRailwayTemporal: true,
  })

  useEffect(() => {
    let mounted = true
    async function loadResources() {
      setLoading(true)
      try {
        const res = await fetch(`/api/teams/${teamId}/import/vercel`, { cache: 'no-store' })
        const payload = await res.json().catch(() => null)
        if (!mounted) return
        if (!res.ok || !payload?.success) {
          setVercelTeams([])
          setVercelProjects([])
          return
        }
        setVercelTeams(payload.data.vercelTeams ?? [])
        setVercelProjects(payload.data.vercelProjects ?? [])
      } catch {
        if (!mounted) return
        setVercelTeams([])
        setVercelProjects([])
      } finally {
        if (mounted) setLoading(false)
      }
    }
    loadResources()
    return () => { mounted = false }
  }, [teamId])

  const visibleProjects = useMemo(() => {
    if (!form.selectedVercelTeamId) return vercelProjects
    return vercelProjects.filter((project) => project.teamId === form.selectedVercelTeamId)
  }, [form.selectedVercelTeamId, vercelProjects])

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!form.name.trim()) {
      toast.error('Le nom du projet est requis')
      return
    }

    setSubmitting(true)
    try {
      const selectedProject = vercelProjects.find((project) => project.id === form.selectedVercelProjectId)
      const payload = {
        name: form.name.trim(),
        description: form.description.trim() || null,
        teamSlug: teamId,
        template: form.template,
        vercelMode: form.vercelMode,
        vercelTeamId: form.selectedVercelTeamId || null,
        vercelProjectId: form.vercelMode === 'link-existing' ? form.selectedVercelProjectId || null : null,
        vercelProjectName: selectedProject?.name ?? form.name.trim(),
        connectNeon: form.connectNeon,
        createGithubRepo: form.createGithubRepo,
        createZohoProject: form.createZohoProject,
        enableRailwayTemporal: form.enableRailwayTemporal,
        stack: [
          'nextjs',
          form.connectNeon ? 'neon' : null,
          form.createGithubRepo ? 'github' : null,
          form.createZohoProject ? 'zoho' : null,
          form.enableRailwayTemporal ? 'temporal' : null,
          form.vercelMode !== 'none' ? 'vercel' : null,
        ].filter(Boolean),
      }

      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const data = await res.json().catch(() => null)
      if (!res.ok || !data?.id) {
        throw new Error(data?.error || 'Création du projet impossible')
      }

      toast.success('Projet NeoBridge créé')
      router.push(`/dashboard/${teamId}/${data.id}/infrastructure`)
      router.refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Création du projet impossible')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            Paramètres initiaux du projet
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="name">Nom du projet</Label>
            <Input id="name" value={form.name} onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))} placeholder="ex. Plateforme Client Acme" />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" value={form.description} onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))} placeholder="Contexte fonctionnel, cible, besoins spécifiques…" rows={4} />
          </div>

          <div className="grid gap-2">
            <Label>Template de départ</Label>
            <Select value={form.template} onValueChange={(value) => setForm((prev) => ({ ...prev, template: value }))}>
              <SelectTrigger>
                <SelectValue placeholder="Choisir un template" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="neosaas-official">NeoSaaS officiel</SelectItem>
                <SelectItem value="starter-clean">Starter allégé</SelectItem>
                <SelectItem value="custom">Custom / liberté maximale</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Rocket className="h-4 w-4" />
            Liaison Vercel
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2">
            <Label>Mode Vercel</Label>
            <Select value={form.vercelMode} onValueChange={(value) => setForm((prev) => ({ ...prev, vercelMode: value, selectedVercelProjectId: '' }))}>
              <SelectTrigger>
                <SelectValue placeholder="Choisir un mode" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="link-existing">Lier un projet existant</SelectItem>
                <SelectItem value="create-new">Préparer la création d’un nouveau projet</SelectItem>
                <SelectItem value="none">Aucune liaison immédiate</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {form.vercelMode === 'link-existing' ? (
            <>
              <div className="grid gap-2">
                <Label>Team Vercel</Label>
                <Select value={form.selectedVercelTeamId} onValueChange={(value) => setForm((prev) => ({ ...prev, selectedVercelTeamId: value, selectedVercelProjectId: '' }))}>
                  <SelectTrigger>
                    <SelectValue placeholder={loading ? 'Chargement…' : 'Toutes les teams'} />
                  </SelectTrigger>
                  <SelectContent>
                    {vercelTeams.length === 0 ? (
                      <SelectItem value="__none" disabled>Aucune team disponible</SelectItem>
                    ) : (
                      vercelTeams.map((team) => <SelectItem key={team.id} value={team.id}>{team.name}</SelectItem>)
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label>Projet Vercel existant</Label>
                <Select value={form.selectedVercelProjectId} onValueChange={(value) => setForm((prev) => ({ ...prev, selectedVercelProjectId: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder={loading ? 'Chargement…' : 'Sélectionner un projet'} />
                  </SelectTrigger>
                  <SelectContent>
                    {visibleProjects.length === 0 ? (
                      <SelectItem value="__none" disabled>Aucun projet Vercel trouvé</SelectItem>
                    ) : (
                      visibleProjects.map((project) => <SelectItem key={project.id} value={project.id}>{project.name}{project.framework ? ` · ${project.framework}` : ''}</SelectItem>)
                    )}
                  </SelectContent>
                </Select>
              </div>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              {form.vercelMode === 'create-new'
                ? 'NeoBridge enregistrera la demande de création Vercel pour l’orchestration ultérieure dans Temporal.'
                : 'Le projet sera créé côté NeoBridge sans liaison Vercel immédiate.'}
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Workflow className="h-4 w-4" />
            Pré-réglages d’orchestration
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {[
            { key: 'connectNeon', label: 'Préparer la connexion Neon', icon: Database },
            { key: 'createGithubRepo', label: 'Préparer le repo GitHub depuis Neosaas-app', icon: GitBranch },
            { key: 'createZohoProject', label: 'Préparer le projet Zoho Projects', icon: FolderKanban },
            { key: 'enableRailwayTemporal', label: 'Activer Railway + Temporal pour l’orchestration', icon: Workflow },
          ].map((item) => {
            const Icon = item.icon
            const checked = form[item.key as keyof typeof form] as boolean
            return (
              <label key={item.key} className="flex items-start gap-3 rounded-lg border p-3 cursor-pointer">
                <Checkbox checked={checked} onCheckedChange={(value) => setForm((prev) => ({ ...prev, [item.key]: Boolean(value) }))} />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium text-sm">{item.label}</span>
                  </div>
                </div>
              </label>
            )
          })}
        </CardContent>
      </Card>

      <div className="flex items-center justify-end gap-3">
        <Button type="submit" disabled={submitting}>
          {submitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
          Créer le projet NeoBridge
        </Button>
      </div>
    </form>
  )
}

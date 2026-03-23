"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import {
  Plus, FolderGit2, Globe, ExternalLink, Loader2,
  Github, Box, FileText, CheckCircle, Clock, AlertCircle, Archive
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle
} from "@/components/ui/card"

type ProjectStatus = 'draft' | 'setting_up' | 'active' | 'paused' | 'archived'

interface DevProject {
  id: string
  name: string
  slug: string
  description: string | null
  status: ProjectStatus
  vercelProjectId: string | null
  vercelDeploymentUrl: string | null
  githubRepoFullName: string | null
  githubRepoUrl: string | null
  cloudflareDomain: string | null
  domainVerified: boolean
  notionPageUrl: string | null
  createdAt: string
  updatedAt: string
}

const statusConfig: Record<ProjectStatus, { label: string; color: string; icon: React.ReactNode }> = {
  draft: { label: 'Brouillon', color: 'bg-gray-100 text-gray-700', icon: <Clock className="h-3 w-3" /> },
  setting_up: { label: 'Configuration...', color: 'bg-yellow-100 text-yellow-700', icon: <Loader2 className="h-3 w-3 animate-spin" /> },
  active: { label: 'Actif', color: 'bg-green-100 text-green-700', icon: <CheckCircle className="h-3 w-3" /> },
  paused: { label: 'En pause', color: 'bg-orange-100 text-orange-700', icon: <AlertCircle className="h-3 w-3" /> },
  archived: { label: 'Archivé', color: 'bg-slate-100 text-slate-500', icon: <Archive className="h-3 w-3" /> },
}

export default function ProjectsPage() {
  const router = useRouter()
  const [projects, setProjects] = useState<DevProject[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/projects')
      .then(r => r.json())
      .then(data => {
        if (data.success) setProjects(data.data)
        else setError(data.error || 'Erreur lors du chargement')
      })
      .catch(() => setError('Impossible de charger les projets'))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-[#1A1A1A]">Projets Dev</h1>
          <p className="text-muted-foreground mt-1">
            Gérez vos projets de développement — Vercel, GitHub, Cloudflare et Notion intégrés.
          </p>
        </div>
        <Button asChild className="bg-brand hover:bg-brand/90">
          <Link href="/admin/projects/new">
            <Plus className="h-4 w-4 mr-2" />
            Nouveau projet
          </Link>
        </Button>
      </div>

      {/* Integration status bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { name: 'Vercel', icon: <Box className="h-4 w-4" />, href: '/api/integrations/vercel' },
          { name: 'GitHub', icon: <Github className="h-4 w-4" />, href: '/api/integrations/github' },
          { name: 'Cloudflare', icon: <Globe className="h-4 w-4" />, href: '/api/integrations/cloudflare' },
          { name: 'Notion', icon: <FileText className="h-4 w-4" />, href: '/api/integrations/notion' },
        ].map((svc) => (
          <IntegrationStatusCard key={svc.name} name={svc.name} icon={svc.icon} endpoint={svc.href} />
        ))}
      </div>

      {/* Projects grid */}
      {loading ? (
        <div className="flex items-center justify-center h-48">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : error ? (
        <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-6 text-destructive text-sm">
          {error}
        </div>
      ) : projects.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed border-muted p-12 text-center">
          <FolderGit2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-1">Aucun projet pour l'instant</h3>
          <p className="text-muted-foreground text-sm mb-4">
            Créez votre premier projet pour démarrer l'intégration Vercel + GitHub.
          </p>
          <Button asChild variant="outline">
            <Link href="/admin/projects/new">
              <Plus className="h-4 w-4 mr-2" />
              Créer un projet
            </Link>
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map(project => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      )}
    </div>
  )
}

function ProjectCard({ project }: { project: DevProject }) {
  const status = statusConfig[project.status] || statusConfig.draft
  const router = useRouter()

  return (
    <Card
      className="hover:shadow-md transition-shadow cursor-pointer"
      onClick={() => router.push(`/admin/projects/${project.id}`)}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <CardTitle className="text-base font-semibold leading-tight">{project.name}</CardTitle>
          <Badge className={`text-xs px-2 py-0.5 flex items-center gap-1 ${status.color}`}>
            {status.icon}
            {status.label}
          </Badge>
        </div>
        {project.description && (
          <CardDescription className="text-xs line-clamp-2 mt-1">{project.description}</CardDescription>
        )}
      </CardHeader>

      <CardContent className="pb-3 space-y-2">
        {project.githubRepoFullName && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Github className="h-3 w-3 shrink-0" />
            <span className="truncate">{project.githubRepoFullName}</span>
          </div>
        )}
        {project.cloudflareDomain && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Globe className="h-3 w-3 shrink-0" />
            <span className="truncate">{project.cloudflareDomain}</span>
            {project.domainVerified && <CheckCircle className="h-3 w-3 text-green-500 shrink-0" />}
          </div>
        )}
        {project.vercelDeploymentUrl && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Box className="h-3 w-3 shrink-0" />
            <span className="truncate">{project.vercelDeploymentUrl}</span>
          </div>
        )}
      </CardContent>

      <CardFooter className="pt-0 gap-2 flex-wrap">
        {project.githubRepoUrl && (
          <a
            href={project.githubRepoUrl}
            target="_blank"
            rel="noreferrer"
            onClick={e => e.stopPropagation()}
            className="text-xs flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ExternalLink className="h-3 w-3" />
            GitHub
          </a>
        )}
        {project.notionPageUrl && (
          <a
            href={project.notionPageUrl}
            target="_blank"
            rel="noreferrer"
            onClick={e => e.stopPropagation()}
            className="text-xs flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ExternalLink className="h-3 w-3" />
            Notion
          </a>
        )}
        <span className="text-xs text-muted-foreground ml-auto">
          {project.slug}
        </span>
      </CardFooter>
    </Card>
  )
}

function IntegrationStatusCard({
  name, icon, endpoint
}: { name: string; icon: React.ReactNode; endpoint: string }) {
  const [status, setStatus] = useState<'loading' | 'ok' | 'error'>('loading')

  useEffect(() => {
    fetch(endpoint)
      .then(r => {
        setStatus(r.ok ? 'ok' : 'error')
      })
      .catch(() => setStatus('error'))
  }, [endpoint])

  return (
    <div className={`rounded-lg border px-3 py-2 flex items-center gap-2 text-sm ${
      status === 'ok' ? 'border-green-200 bg-green-50' :
      status === 'error' ? 'border-red-200 bg-red-50' :
      'border-gray-200 bg-gray-50'
    }`}>
      <span className={`${
        status === 'ok' ? 'text-green-600' :
        status === 'error' ? 'text-red-500' :
        'text-gray-400'
      }`}>{icon}</span>
      <span className="font-medium text-foreground">{name}</span>
      {status === 'loading' && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground ml-auto" />}
      {status === 'ok' && <CheckCircle className="h-3 w-3 text-green-500 ml-auto" />}
      {status === 'error' && <AlertCircle className="h-3 w-3 text-red-400 ml-auto" />}
    </div>
  )
}

import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Key, Plus } from 'lucide-react'
import { serviceApiRepository } from '@/lib/services'
import { syncVercelTeams, listVercelProjects } from '@/lib/connectors/vercel'
import { formatDistanceToNow } from 'date-fns'
import { fr } from 'date-fns/locale'
import { ProjectsSearchWrapper } from '@/components/dashboard/projects-search-wrapper'

export const metadata = { title: 'Projets — NeoBridge' }
export const dynamic = 'force-dynamic'

const DEPLOY_VARIANT: Record<string, 'default' | 'secondary' | 'outline' | 'destructive'> = {
  READY: 'default', ERROR: 'destructive', BUILDING: 'secondary',
  QUEUED: 'outline', CANCELED: 'outline',
}
const DEPLOY_LABEL: Record<string, string> = {
  READY: 'En ligne', ERROR: 'Erreur', BUILDING: 'Build…',
  QUEUED: 'En attente', CANCELED: 'Annulé',
}

interface ProjectCard {
  id: string; name: string; framework: string | null; updatedAt: number
  deployState: string | null; teamSlug: string; teamName: string
}

async function fetchAllProjects(): Promise<ProjectCard[] | null> {
  try {
    const config = await serviceApiRepository.getConfig('vercel', 'production')
    const token = (config?.config as Record<string, unknown>)?.apiToken as string | undefined
    if (!token) return null
    const teams = await syncVercelTeams(token)
    if (!teams.length) return null
    const grouped = await Promise.all(teams.map(async (team) => {
      const projects = await listVercelProjects(team.id, token)
      return projects.map<ProjectCard>((p) => ({
        id: p.id, name: p.name, framework: p.framework, updatedAt: p.updatedAt,
        deployState: p.latestDeployments?.[0]?.readyState ?? null,
        teamSlug: team.slug, teamName: team.name,
      }))
    }))
    return grouped.flat().sort((a, b) => b.updatedAt - a.updatedAt)
  } catch { return null }
}

export default async function ProjectsPage() {
  const projects = await fetchAllProjects()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Projets</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {projects
              ? `${projects.length} projet${projects.length !== 1 ? 's' : ''} · Vercel`
              : 'Token Vercel requis'}
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard/new">
            <Plus className="h-4 w-4 mr-2" />Nouveau projet
          </Link>
        </Button>
      </div>

      {projects === null && (
        <div className="flex flex-col items-center justify-center border border-dashed rounded-lg py-20 text-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            <Key className="h-6 w-6 text-muted-foreground" />
          </div>
          <div>
            <p className="font-medium">Token Vercel non configuré</p>
            <p className="text-sm text-muted-foreground mt-1">Configurez votre token dans Gestion des API.</p>
          </div>
          <Button asChild><Link href="/admin/api">Configurer Vercel</Link></Button>
        </div>
      )}

      {projects !== null && (
        <ProjectsSearchWrapper
          projects={projects}
          deployVariant={DEPLOY_VARIANT}
          deployLabel={DEPLOY_LABEL}
        />
      )}
    </div>
  )
}

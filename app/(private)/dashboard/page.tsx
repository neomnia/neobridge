import Link from 'next/link'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ImpersonationBanner } from '@/components/admin/impersonation-banner'
import { Key } from 'lucide-react'
import { serviceApiRepository } from '@/lib/services'
import { syncVercelTeams, listVercelProjects } from '@/lib/connectors/vercel'
import { formatDistanceToNow } from 'date-fns'
import { fr } from 'date-fns/locale'

export const metadata = { title: 'Projets — NeoBridge' }

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ProjectCard {
  id: string
  name: string
  framework: string | null
  updatedAt: number
  deployState: string | null
  deployUrl: string | null
  teamSlug: string
  teamName: string
}

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------

const DEPLOY_VARIANT: Record<string, 'default' | 'secondary' | 'outline' | 'destructive'> = {
  READY:    'default',
  ERROR:    'destructive',
  BUILDING: 'secondary',
  QUEUED:   'outline',
  CANCELED: 'outline',
}
const DEPLOY_LABEL: Record<string, string> = {
  READY:    'En ligne',
  ERROR:    'Erreur',
  BUILDING: 'Build…',
  QUEUED:   'En attente',
  CANCELED: 'Annulé',
}

async function fetchAllProjects(): Promise<ProjectCard[] | null> {
  try {
    const config = await serviceApiRepository.getConfig('vercel', 'production')
    const token = (config?.config as Record<string, unknown> | undefined)?.apiToken as string | undefined
    if (!token) return null

    const teams = await syncVercelTeams(token)
    if (teams.length === 0) return null

    const grouped = await Promise.all(
      teams.map(async (team) => {
        const projects = await listVercelProjects(team.id, token)
        return projects.map<ProjectCard>((p) => ({
          id:          p.id,
          name:        p.name,
          framework:   p.framework,
          updatedAt:   p.updatedAt,
          deployState: p.latestDeployments?.[0]?.readyState ?? null,
          deployUrl:   p.latestDeployments?.[0]?.url ?? null,
          teamSlug:    team.slug,
          teamName:    team.name,
        }))
      }),
    )

    return grouped.flat().sort((a, b) => b.updatedAt - a.updatedAt)
  } catch {
    return null
  }
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function DashboardPage() {
  const projects = await fetchAllProjects()

  return (
    <div className="space-y-6">
      <ImpersonationBanner />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Projets</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {projects
              ? `${projects.length} projet${projects.length !== 1 ? 's' : ''} — Vercel`
              : 'Token Vercel requis'}
          </p>
        </div>
      </div>

      {projects === null && (
        <div className="flex flex-col items-center justify-center border border-dashed rounded-lg py-20 text-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            <Key className="h-6 w-6 text-muted-foreground" />
          </div>
          <div>
            <p className="font-medium">Token Vercel non configuré</p>
            <p className="text-sm text-muted-foreground mt-1">
              Configurez votre token dans Gestion des API pour voir vos projets.
            </p>
          </div>
          <Button asChild>
            <Link href="/admin/api">Configurer Vercel</Link>
          </Button>
        </div>
      )}

      {projects !== null && projects.length === 0 && (
        <p className="text-muted-foreground">Aucun projet trouvé sur Vercel.</p>
      )}

      {projects !== null && projects.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((project) => (
            <Link
              key={project.id}
              href={`/dashboard/${project.teamSlug}/${project.name}/infrastructure`}
            >
              <Card className="hover:border-primary/50 transition-colors cursor-pointer h-full">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-base truncate">{project.name}</h3>
                      {project.framework && (
                        <p className="text-xs text-muted-foreground mt-0.5">{project.framework}</p>
                      )}
                    </div>
                    {project.deployState && (
                      <Badge
                        variant={DEPLOY_VARIANT[project.deployState] ?? 'outline'}
                        className="shrink-0 text-xs"
                      >
                        {DEPLOY_LABEL[project.deployState] ?? project.deployState}
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(project.updatedAt), {
                        addSuffix: true,
                        locale: fr,
                      })}
                    </p>
                    <Badge variant="outline" className="text-xs font-mono shrink-0">
                      {project.teamSlug}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

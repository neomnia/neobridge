import { Badge } from '@/components/ui/badge'
import { serviceApiRepository } from '@/lib/services'
import { syncVercelTeams, listVercelProjects } from '@/lib/connectors/vercel'

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

async function fetchProjectMeta(teamSlug: string, projectName: string) {
  try {
    const config = await serviceApiRepository.getConfig('vercel', 'production')
    const token = (config?.config as Record<string, unknown> | undefined)?.apiToken as string | undefined
    if (!token) return null

    const vercelTeams = await syncVercelTeams(token)
    const team = vercelTeams.find((t) => t.slug === teamSlug)
    if (!team) return null

    const projects = await listVercelProjects(team.id, token)
    const project = projects.find((p) => p.name === projectName)
    if (!project) return null

    return {
      name:       project.name,
      framework:  project.framework ?? null,
      deployState: project.latestDeployments?.[0]?.readyState ?? null,
    }
  } catch {
    return null
  }
}

export default async function ProjectLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ teamId: string; projectId: string }>
}) {
  const { teamId, projectId } = await params
  const meta = await fetchProjectMeta(teamId, projectId)

  const displayName = meta?.name ?? projectId
  const deployState = meta?.deployState ?? null
  const framework   = meta?.framework ?? null

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 pb-4 border-b">
        <div>
          <h1 className="text-xl font-bold">{displayName}</h1>
          {framework && (
            <p className="text-sm text-muted-foreground mt-0.5">{framework}</p>
          )}
        </div>
        {deployState && (
          <Badge
            variant={DEPLOY_VARIANT[deployState] ?? 'outline'}
            className="shrink-0"
          >
            {DEPLOY_LABEL[deployState] ?? deployState}
          </Badge>
        )}
      </div>

      {children}
    </div>
  )
}

import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import { fr } from 'date-fns/locale'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ImpersonationBanner } from '@/components/admin/impersonation-banner'
import {
  Activity,
  ArrowUpRight,
  Building2,
  DollarSign,
  FolderKanban,
  GitBranch,
  Key,
  Rocket,
  Server,
  Workflow,
} from 'lucide-react'
import { extractGitHubRepoReferences, listRecentGitHubActivity } from '@/lib/github/client'
import { listRailwayProjects } from '@/lib/railway/client'
import { listVercelDeployments, listVercelTeams } from '@/lib/vercel/client'

export const metadata = { title: 'Cockpit global — NeoBridge' }
export const dynamic = 'force-dynamic'

interface Team {
  id: string
  name: string
  slug: string
  plan: 'free' | 'pro' | 'enterprise'
  projectCount: number
}

interface RecentProject {
  id: string
  name: string
  teamName: string
  href: string
  updatedAt: Date | null
  status: string
  hasVercel: boolean
  hasGithub: boolean
  hasZoho: boolean
  hasRailway: boolean
}

interface ActivityItem {
  id: string
  title: string
  subtitle: string
  href: string
  timestamp: Date | null
  source: 'vercel' | 'github' | 'railway' | 'project'
  state: string
}

const PLAN_VARIANT: Record<string, 'default' | 'secondary' | 'outline'> = {
  free: 'outline',
  pro: 'default',
  enterprise: 'secondary',
}

const PLAN_LABEL: Record<string, string> = {
  free: 'Free',
  pro: 'Pro',
  enterprise: 'Enterprise',
}

const STATE_VARIANT: Record<string, 'default' | 'secondary' | 'outline' | 'destructive'> = {
  READY: 'default',
  ERROR: 'destructive',
  BUILDING: 'secondary',
  PUSHED: 'default',
  UPDATED: 'secondary',
  LINKED: 'outline',
}

function formatRelativeDate(date: Date | null) {
  if (!date) return 'Date inconnue'
  return formatDistanceToNow(date, { addSuffix: true, locale: fr })
}

async function fetchDashboardData(): Promise<{
  teams: Team[]
  totalProjects: number
  activeServices: number
  projectsWithVercel: number
  projectsWithGithub: number
  projectsWithZoho: number
  projectsWithRailway: number
  recentProjects: RecentProject[]
  recentActivity: ActivityItem[]
}> {
  try {
    const { db } = await import('@/db')
    const { adminApiKeys, projectApps, projectConnectors, projects, serviceApiConfigs, teams } = await import('@/db/schema')
    const { eq } = await import('drizzle-orm')

    const [teamRows, projectRows, appRows, connectorRows, serviceRows, legacyServiceRows] = await Promise.all([
      db.select().from(teams),
      db.select({
        id: projects.id,
        name: projects.name,
        status: projects.status,
        description: projects.description,
        teamId: projects.teamId,
        updatedAt: projects.updatedAt,
      }).from(projects),
      db.select({
        projectId: projectApps.projectId,
        platform: projectApps.platform,
        name: projectApps.name,
        externalResourceId: projectApps.externalResourceId,
      }).from(projectApps),
      db.select({
        projectId: projectConnectors.projectId,
        type: projectConnectors.type,
        label: projectConnectors.label,
        config: projectConnectors.config,
      }).from(projectConnectors),
      db.select({ serviceName: serviceApiConfigs.serviceName }).from(serviceApiConfigs).where(eq(serviceApiConfigs.isActive, true)),
      db.select({ type: adminApiKeys.type }).from(adminApiKeys),
    ])

    const projectCountByTeam = new Map<string, number>()
    const teamMap = new Map(teamRows.map((team) => [team.id, team]))
    const appMap = new Map<string, typeof appRows>()
    const connectorMap = new Map<string, typeof connectorRows>()

    for (const project of projectRows) {
      if (!project.teamId) continue
      projectCountByTeam.set(project.teamId, (projectCountByTeam.get(project.teamId) ?? 0) + 1)
    }

    for (const app of appRows) {
      const list = appMap.get(app.projectId) ?? []
      list.push(app)
      appMap.set(app.projectId, list)
    }

    for (const connector of connectorRows) {
      const list = connectorMap.get(connector.projectId) ?? []
      list.push(connector)
      connectorMap.set(connector.projectId, list)
    }

    const activeServiceNames = new Set<string>()
    for (const row of serviceRows) {
      activeServiceNames.add(row.serviceName === 'github_api' ? 'github_token' : row.serviceName)
    }
    for (const row of legacyServiceRows) {
      activeServiceNames.add(row.type === 'github_api' ? 'github_token' : row.type)
    }

    const projectSnapshots = projectRows.map((project) => {
      const team = project.teamId ? teamMap.get(project.teamId) : null
      const apps = appMap.get(project.id) ?? []
      const connectors = connectorMap.get(project.id) ?? []
      return {
        id: project.id,
        name: project.name,
        teamName: team?.name ?? 'Sans équipe',
        href: team?.slug ? `/dashboard/${team.slug}/${project.id}/infrastructure` : '/dashboard/projects-pm',
        updatedAt: project.updatedAt ? new Date(project.updatedAt) : null,
        status: project.status,
        hasVercel: apps.some((app) => app.platform === 'vercel') || connectors.some((connector) => connector.type === 'vercel'),
        hasGithub: connectors.some((connector) => connector.type === 'github'),
        hasZoho: connectors.some((connector) => connector.type === 'zoho'),
        hasRailway: apps.some((app) => app.platform === 'railway') || connectors.some((connector) => connector.type === 'railway'),
      }
    })

    const recentProjects = projectSnapshots
      .slice()
      .sort((a, b) => (b.updatedAt?.getTime() ?? 0) - (a.updatedAt?.getTime() ?? 0))
      .slice(0, 5)

    const projectsWithVercel = projectSnapshots.filter((project) => project.hasVercel).length
    const projectsWithGithub = projectSnapshots.filter((project) => project.hasGithub).length
    const projectsWithZoho = projectSnapshots.filter((project) => project.hasZoho).length
    const projectsWithRailway = projectSnapshots.filter((project) => project.hasRailway).length

    const linkedProjectByResource = new Map(
      appRows
        .filter((app) => app.externalResourceId)
        .map((app) => [app.externalResourceId, app.projectId]),
    )
    const linkedProjectByName = new Map(
      appRows.map((app) => [app.name.toLowerCase(), app.projectId]),
    )
    const linkedProjectByGithubRef = new Map<string, string>()

    for (const connector of connectorRows.filter((connector) => connector.type === 'github')) {
      for (const ref of extractGitHubRepoReferences({ label: connector.label, config: connector.config })) {
        if (!linkedProjectByGithubRef.has(ref)) {
          linkedProjectByGithubRef.set(ref, connector.projectId)
        }
      }
    }

    for (const project of projectRows) {
      const projectRef = project.name.trim().toLowerCase()
      if (projectRef && !linkedProjectByGithubRef.has(projectRef)) {
        linkedProjectByGithubRef.set(projectRef, project.id)
      }
    }

    let recentActivity: ActivityItem[] = recentProjects.map((project) => ({
      id: `project-${project.id}`,
      title: project.name,
      subtitle: `Projet NeoBridge · ${project.teamName}`,
      href: project.href,
      timestamp: project.updatedAt,
      source: 'project',
      state: 'UPDATED',
    }))

    // Paralléliser les 3 appels API externes avec timeout (5s max chacun)
    const withTimeout = <T,>(promise: Promise<T>, ms = 5000): Promise<T> =>
      Promise.race([promise, new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), ms))])

    const [vercelResult, railwayResult, githubResult] = await Promise.allSettled([
      withTimeout(async function fetchVercel() {
        const vercelTeams = await listVercelTeams()
        const deploymentGroups = await Promise.all(
          vercelTeams.slice(0, 5).map(async (team) => {
            const deployments = await listVercelDeployments({ vercelTeamId: team.id, limit: 4 }).catch(() => [])
            return deployments.map((deployment) => {
              const linkedProjectId = linkedProjectByResource.get(deployment.projectId ?? '') || linkedProjectByName.get(deployment.name.toLowerCase())
              const linkedProject = projectSnapshots.find((project) => project.id === linkedProjectId)
              return {
                id: `vercel-${deployment.id}`,
                title: deployment.name,
                subtitle: `Déploiement Vercel · ${team.name}`,
                href: linkedProject?.href ?? '/dashboard/deployments',
                timestamp: new Date(deployment.createdAt),
                source: 'vercel' as const,
                state: deployment.state,
              }
            })
          }),
        )
        return deploymentGroups.flat()
      }()),

      withTimeout(async function fetchRailway() {
        const railwayProjects = await listRailwayProjects()
        return railwayProjects.slice(0, 3).map((project) => ({
          id: `railway-${project.id}`,
          title: project.name,
          subtitle: `Mise à jour Railway · ${project.services?.length ?? 0} service(s)`,
          href: '/dashboard/deployments',
          timestamp: project.updatedAt ? new Date(project.updatedAt) : project.createdAt ? new Date(project.createdAt) : null,
          source: 'railway' as const,
          state: 'LINKED',
        }))
      }()),

      withTimeout(async function fetchGitHub() {
        const githubActivity = await listRecentGitHubActivity({ limit: 5 })
        return githubActivity.map((activity) => {
          const linkedProjectId = linkedProjectByGithubRef.get(activity.fullName.toLowerCase()) || linkedProjectByGithubRef.get(activity.repoName.toLowerCase())
          const linkedProject = projectSnapshots.find((project) => project.id === linkedProjectId)
          return {
            id: `github-${activity.id}`,
            title: activity.fullName,
            subtitle: activity.state === 'PUSHED'
              ? `GitHub · push sur ${activity.branch ?? 'default'}`
              : `GitHub · dépôt mis à jour`,
            href: linkedProject?.href ?? '/dashboard/github',
            timestamp: new Date(activity.timestamp),
            source: 'github' as const,
            state: activity.state,
          }
        })
      }()),
    ])

    if (vercelResult.status === 'fulfilled') recentActivity = recentActivity.concat(vercelResult.value)
    if (railwayResult.status === 'fulfilled') recentActivity = recentActivity.concat(railwayResult.value)
    if (githubResult.status === 'fulfilled') recentActivity = recentActivity.concat(githubResult.value)

    recentActivity = recentActivity
      .sort((a, b) => (b.timestamp?.getTime() ?? 0) - (a.timestamp?.getTime() ?? 0))
      .slice(0, 8)

    return {
      teams: teamRows.map((team) => ({
        id: team.id,
        name: team.name,
        slug: team.slug,
        plan: (team.plan ?? 'free') as Team['plan'],
        projectCount: projectCountByTeam.get(team.id) ?? 0,
      })),
      totalProjects: projectRows.length,
      activeServices: activeServiceNames.size,
      projectsWithVercel,
      projectsWithGithub,
      projectsWithZoho,
      projectsWithRailway,
      recentProjects,
      recentActivity,
    }
  } catch {
    return {
      teams: [],
      totalProjects: 0,
      activeServices: 0,
      projectsWithVercel: 0,
      projectsWithGithub: 0,
      projectsWithZoho: 0,
      projectsWithRailway: 0,
      recentProjects: [],
      recentActivity: [],
    }
  }
}

export default async function DashboardPage() {
  const {
    teams,
    totalProjects,
    activeServices,
    projectsWithVercel,
    projectsWithGithub,
    projectsWithZoho,
    projectsWithRailway,
    recentProjects,
    recentActivity,
  } = await fetchDashboardData()

  return (
    <div className="space-y-6">
      <ImpersonationBanner />

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Cockpit global NeoBridge</h1>
          <p className="text-muted-foreground text-sm mt-1 max-w-2xl">
            Aperçu de production en volume et en qualité : derniers changements, déploiements visibles, couverture des services et accès direct aux pages concernées.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <Link href="/dashboard/projects-pm">
              <FolderKanban className="h-4 w-4 mr-2" />
              Gestion PM
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/dashboard/github">
              <GitBranch className="h-4 w-4 mr-2" />
              GitHub
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/dashboard/costs">
              <DollarSign className="h-4 w-4 mr-2" />
              Coûts
            </Link>
          </Button>
          <Button asChild>
            <Link href="/dashboard/deployments">
              <Rocket className="h-4 w-4 mr-2" />
              Déploiements
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">Workspaces</p><p className="text-2xl font-bold mt-1">{teams.length}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">Projets NeoBridge</p><p className="text-2xl font-bold mt-1">{totalProjects}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">Services actifs</p><p className="text-2xl font-bold mt-1">{activeServices}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">Mouvements récents</p><p className="text-2xl font-bold mt-1">{recentActivity.length}</p></CardContent></Card>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-4">
        <Card className="xl:col-span-3">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Activity className="h-4 w-4 text-muted-foreground" />
                Derniers changements
              </CardTitle>
              <Button asChild variant="ghost" size="sm">
                <Link href="/dashboard/projects-pm">Voir le détail</Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentActivity.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucune activité récente visible pour le moment.</p>
            ) : (
              recentActivity.map((item) => (
                <Link key={item.id} href={item.href} className="block rounded-lg border p-3 hover:border-primary/50 transition-colors">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-sm">{item.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{item.subtitle}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant={STATE_VARIANT[item.state] ?? 'outline'}>{item.state}</Badge>
                      <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground" />
                    </div>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-2">{formatRelativeDate(item.timestamp)}</p>
                </Link>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="xl:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Workflow className="h-4 w-4 text-muted-foreground" />
              Couverture production
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <p className="font-medium text-sm">Projets reliés à Vercel</p>
                <p className="text-xs text-muted-foreground">Vue déploiements & previews</p>
              </div>
              <Badge>{projectsWithVercel}/{totalProjects || 0}</Badge>
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <p className="font-medium text-sm">Projets reliés à GitHub</p>
                <p className="text-xs text-muted-foreground">Repos, pushes et modifications</p>
              </div>
              <Badge variant="secondary">{projectsWithGithub}/{totalProjects || 0}</Badge>
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <p className="font-medium text-sm">Projets reliés à Zoho</p>
                <p className="text-xs text-muted-foreground">Suivi PM & tickets</p>
              </div>
              <Badge variant="secondary">{projectsWithZoho}/{totalProjects || 0}</Badge>
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <p className="font-medium text-sm">Projets reliés à Railway</p>
                <p className="text-xs text-muted-foreground">Services backend & orchestration</p>
              </div>
              <Badge variant="outline">{projectsWithRailway}/{totalProjects || 0}</Badge>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
              <Button asChild variant="outline" size="sm">
                <Link href="/dashboard/github">Voir GitHub</Link>
              </Button>
              <Button asChild variant="outline" size="sm">
                <Link href="/dashboard/costs">Voir les coûts</Link>
              </Button>
              <Button asChild variant="outline" size="sm">
                <Link href="/dashboard/api-keys">Voir les APIs</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Server className="h-4 w-4 text-muted-foreground" />
              Derniers projets modifiés
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentProjects.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucun projet modifié récemment.</p>
            ) : (
              recentProjects.map((project) => (
                <Link key={project.id} href={project.href} className="block rounded-lg border p-3 hover:border-primary/50 transition-colors">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-sm">{project.name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{project.teamName} · {formatRelativeDate(project.updatedAt)}</p>
                    </div>
                    <Badge variant={project.status === 'active' ? 'default' : 'outline'}>{project.status}</Badge>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-3">
                    <Badge variant={project.hasVercel ? 'default' : 'outline'}>Vercel</Badge>
                    <Badge variant={project.hasGithub ? 'default' : 'outline'}>GitHub</Badge>
                    <Badge variant={project.hasZoho ? 'secondary' : 'outline'}>Zoho</Badge>
                    <Badge variant={project.hasRailway ? 'secondary' : 'outline'}>Railway</Badge>
                  </div>
                </Link>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              Aperçu des workspaces
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {teams.length === 0 ? (
              <div className="rounded-lg border border-dashed p-6 text-center">
                <p className="font-medium text-muted-foreground">Aucun workspace NeoBridge détecté</p>
                <p className="text-sm text-muted-foreground mt-1">Le cockpit global est prêt ; la prochaine étape consiste à rattacher ou créer les workspaces et projets.</p>
              </div>
            ) : (
              teams.map((team) => (
                <Link key={team.id} href={`/dashboard/${team.slug ?? team.id}`} className="block rounded-lg border p-3 hover:border-primary/50 transition-colors">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-sm">{team.name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">/{team.slug} · {team.projectCount} projet{team.projectCount !== 1 ? 's' : ''}</p>
                    </div>
                    <Badge variant={PLAN_VARIANT[team.plan] ?? 'outline'}>{PLAN_LABEL[team.plan] ?? team.plan}</Badge>
                  </div>
                </Link>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <div className="rounded-xl border bg-card p-4 text-sm text-muted-foreground flex items-start gap-3">
        <GitBranch className="h-4 w-4 mt-0.5 shrink-0" />
        <p>
          Ce cockpit agrège les derniers mouvements de production et pointe vers les pages spécialisées pour agir : <Link href="/dashboard/deployments" className="underline underline-offset-2">déploiements</Link>, <Link href="/dashboard/github" className="underline underline-offset-2">GitHub</Link>, <Link href="/dashboard/costs" className="underline underline-offset-2">coûts</Link>, <Link href="/dashboard/projects-pm" className="underline underline-offset-2">gestion PM</Link> et <Link href="/dashboard/api-keys" className="underline underline-offset-2">connectivité API</Link>.
        </p>
      </div>
    </div>
  )
}

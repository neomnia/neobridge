import Link from 'next/link'
import { FolderKanban, ExternalLink, Workflow, Server, BarChart3 } from 'lucide-react'
import { db } from '@/db'
import { projectApps, projectConnectors, projects, teams } from '@/db/schema'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { listAllVercelProjects, listVercelTeams } from '@/lib/vercel/client'
import { listZohoProjects } from '@/lib/zoho-data'

export const metadata = { title: 'Gestion de projets — NeoBridge' }
export const dynamic = 'force-dynamic'

async function fetchProjectsCockpit() {
  try {
    const [teamRows, projectRows, appRows, connectorRows, vercelTeams, vercelProjects, zohoProjects] = await Promise.all([
      db.select({ id: teams.id, slug: teams.slug, name: teams.name }).from(teams),
      db.select({ id: projects.id, name: projects.name, description: projects.description, status: projects.status, teamId: projects.teamId }).from(projects),
      db.select({ projectId: projectApps.projectId, platform: projectApps.platform, externalResourceId: projectApps.externalResourceId, name: projectApps.name }).from(projectApps),
      db.select({ projectId: projectConnectors.projectId, type: projectConnectors.type, label: projectConnectors.label }).from(projectConnectors),
      listVercelTeams().catch(() => []),
      listAllVercelProjects().catch(() => []),
      listZohoProjects().catch(() => []),
    ])

    const teamMap = new Map(teamRows.map((team) => [team.id, team]))

    return {
      teams: teamRows,
      vercelTeams,
      vercelProjects,
      zohoProjects,
      projects: projectRows.map((project) => {
        const relatedApps = appRows.filter((app) => app.projectId === project.id)
        const relatedConnectors = connectorRows.filter((connector) => connector.projectId === project.id)
        const team = project.teamId ? teamMap.get(project.teamId) : null

        return {
          ...project,
          teamName: team?.name ?? 'Sans équipe',
          teamSlug: team?.slug ?? null,
          hasVercel: relatedApps.some((app) => app.platform === 'vercel') || relatedConnectors.some((connector) => connector.type === 'vercel'),
          hasGithub: relatedConnectors.some((connector) => connector.type === 'github'),
          hasZoho: relatedConnectors.some((connector) => connector.type === 'zoho'),
          hasRailway: relatedApps.some((app) => app.platform === 'railway') || relatedConnectors.some((connector) => connector.type === 'railway'),
          resourceCount: relatedApps.length + relatedConnectors.length,
        }
      }),
    }
  } catch {
    return {
      teams: [],
      projects: [],
      vercelTeams: [],
      vercelProjects: [],
      zohoProjects: [],
    }
  }
}

export default async function ProjectsPmPage() {
  const cockpit = await fetchProjectsCockpit()

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <FolderKanban className="h-7 w-7 text-violet-500" />
          <div>
            <h1 className="text-2xl font-bold">Gestion de projets</h1>
            <p className="text-muted-foreground text-sm mt-0.5">
              Cockpit global NeoBridge pour relier workspaces, Vercel, GitHub et Zoho
            </p>
          </div>
        </div>
        <Button asChild variant="outline">
          <Link href="/dashboard">
            <Workflow className="h-4 w-4 mr-2" />
            Retour au cockpit
          </Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">Workspaces</p><p className="text-2xl font-bold mt-1">{cockpit.teams.length}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">Projets NeoBridge</p><p className="text-2xl font-bold mt-1">{cockpit.projects.length}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">Projets Vercel visibles</p><p className="text-2xl font-bold mt-1">{cockpit.vercelProjects.length}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">Projets Zoho visibles</p><p className="text-2xl font-bold mt-1">{cockpit.zohoProjects.length}</p></CardContent></Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Synchronisation Vercel</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          {cockpit.vercelTeams.length === 0 ? (
            <p className="text-muted-foreground">
              Aucun team Vercel visible pour le moment. Configure le token dans <Link href="/admin/api" className="underline underline-offset-2">Admin → API Management</Link>.
            </p>
          ) : (
            <div className="space-y-2">
              {cockpit.vercelTeams.map((team) => {
                const count = cockpit.vercelProjects.filter((project) => (project.teamId === team.id) || (project.teamSlug === team.slug)).length
                return (
                  <div key={team.id} className="flex items-center justify-between rounded-lg border p-3">
                    <div>
                      <p className="font-medium">{team.name}</p>
                      <p className="text-xs text-muted-foreground">/{team.slug}</p>
                    </div>
                    <Badge variant="secondary">{count} projet{count !== 1 ? 's' : ''}</Badge>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Vue globale des projets</CardTitle>
        </CardHeader>
        <CardContent>
          {cockpit.projects.length === 0 ? (
            <div className="border border-dashed rounded-lg py-12 text-center space-y-3">
              <p className="font-medium text-muted-foreground">Aucun projet NeoBridge créé</p>
              <p className="text-sm text-muted-foreground">Commence par créer un projet depuis un workspace, puis lie Vercel et Zoho.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {cockpit.projects.map((project) => {
                const href = project.teamSlug ? `/dashboard/${project.teamSlug}/${project.id}/infrastructure` : '/dashboard'
                return (
                  <Link key={project.id} href={href}>
                    <Card className="h-full hover:border-primary/50 transition-colors">
                      <CardContent className="p-4 space-y-3">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-semibold">{project.name}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">{project.teamName}</p>
                          </div>
                          <Badge variant={project.status === 'active' ? 'default' : 'outline'}>{project.status}</Badge>
                        </div>
                        {project.description ? (
                          <p className="text-sm text-muted-foreground line-clamp-2">{project.description}</p>
                        ) : null}
                        <div className="flex flex-wrap gap-2">
                          <Badge variant={project.hasVercel ? 'default' : 'outline'}>Vercel</Badge>
                          <Badge variant={project.hasGithub ? 'default' : 'outline'}>GitHub</Badge>
                          <Badge variant={project.hasZoho ? 'default' : 'outline'}>Zoho</Badge>
                          <Badge variant={project.hasRailway ? 'secondary' : 'outline'}>Railway</Badge>
                          <Badge variant="secondary">{project.resourceCount} ressource{project.resourceCount !== 1 ? 's' : ''}</Badge>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="rounded-xl border bg-card p-4 text-sm text-muted-foreground flex items-start gap-3">
        <BarChart3 className="h-4 w-4 mt-0.5 shrink-0" />
        <p>
          NeoBridge reste la source de vérité. Vercel, GitHub et Zoho alimentent la vue globale, mais les décisions de liaison et d’orchestration se font ici.
        </p>
      </div>
    </div>
  )
}

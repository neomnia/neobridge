import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import { fr } from 'date-fns/locale'
import { ExternalLink, GitBranch, Key, Workflow } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { db } from '@/db'
import { projectConnectors, projects, teams } from '@/db/schema'
import { extractGitHubRepoReferences, listGitHubRepositories, listRecentGitHubActivity } from '@/lib/github/client'

export const metadata = { title: 'GitHub — NeoBridge' }
export const dynamic = 'force-dynamic'

function formatRelativeDate(date: Date | null) {
  if (!date) return 'Date inconnue'
  return formatDistanceToNow(date, { addSuffix: true, locale: fr })
}

async function fetchGitHubOverview() {
  try {
    const [repositories, recentActivity, teamRows, projectRows, connectorRows] = await Promise.all([
      listGitHubRepositories({ limit: 80 }),
      listRecentGitHubActivity({ limit: 8 }),
      db.select({ id: teams.id, slug: teams.slug, name: teams.name }).from(teams),
      db.select({ id: projects.id, name: projects.name, teamId: projects.teamId }).from(projects),
      db.select({ projectId: projectConnectors.projectId, type: projectConnectors.type, label: projectConnectors.label, config: projectConnectors.config }).from(projectConnectors),
    ])

    const teamMap = new Map(teamRows.map((team) => [team.id, team]))
    const projectMap = new Map(
      projectRows.map((project) => [project.id, {
        ...project,
        teamSlug: project.teamId ? teamMap.get(project.teamId)?.slug ?? null : null,
      }]),
    )

    const linkedProjectByRepoRef = new Map<string, string>()

    for (const connector of connectorRows.filter((connector) => connector.type === 'github')) {
      for (const ref of extractGitHubRepoReferences({ label: connector.label, config: connector.config })) {
        if (!linkedProjectByRepoRef.has(ref)) {
          linkedProjectByRepoRef.set(ref, connector.projectId)
        }
      }
    }

    for (const project of projectRows) {
      const projectRef = project.name.trim().toLowerCase()
      if (projectRef && !linkedProjectByRepoRef.has(projectRef)) {
        linkedProjectByRepoRef.set(projectRef, project.id)
      }
    }

    const resolveLinkedProject = (repoName: string, fullName: string) => {
      const projectId = linkedProjectByRepoRef.get(fullName.toLowerCase()) || linkedProjectByRepoRef.get(repoName.toLowerCase())
      return projectId ? projectMap.get(projectId) ?? null : null
    }

    const rows = repositories.map((repository) => {
      const linkedProject = resolveLinkedProject(repository.name, repository.fullName)
      const pushedAt = repository.pushedAt ? new Date(repository.pushedAt) : null
      const updatedAt = repository.updatedAt ? new Date(repository.updatedAt) : null
      const lastActivityAt = pushedAt && updatedAt
        ? (pushedAt > updatedAt ? pushedAt : updatedAt)
        : pushedAt ?? updatedAt

      return {
        ...repository,
        linkedProjectName: linkedProject?.name ?? null,
        linkedProjectHref: linkedProject?.teamSlug
          ? `/dashboard/${linkedProject.teamSlug}/${linkedProject.id}/infrastructure`
          : '/dashboard/projects-pm',
        isLinked: Boolean(linkedProject),
        lastActivityAt,
      }
    })

    const activityRows = recentActivity.map((activity) => {
      const linkedProject = resolveLinkedProject(activity.repoName, activity.fullName)
      return {
        ...activity,
        href: linkedProject?.teamSlug
          ? `/dashboard/${linkedProject.teamSlug}/${linkedProject.id}/infrastructure`
          : '/dashboard/github',
        linkedProjectName: linkedProject?.name ?? null,
      }
    })

    const now = Date.now()

    return {
      configured: true,
      rows,
      activityRows,
      linkedCount: rows.filter((row) => row.isLinked).length,
      privateCount: rows.filter((row) => row.isPrivate).length,
      recentChangesCount: rows.filter((row) => row.lastActivityAt && now - row.lastActivityAt.getTime() <= 7 * 24 * 60 * 60 * 1000).length,
    }
  } catch {
    return {
      configured: false,
      rows: [],
      activityRows: [],
      linkedCount: 0,
      privateCount: 0,
      recentChangesCount: 0,
    }
  }
}

export default async function GitHubDashboardPage() {
  const overview = await fetchGitHubOverview()

  if (!overview.configured) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted">
          <Key className="h-7 w-7 text-muted-foreground" />
        </div>
        <div>
          <p className="font-semibold text-lg">Token GitHub non configuré</p>
          <p className="text-sm text-muted-foreground mt-1">Configure le token GitHub pour afficher les repos, les derniers pushes et les liens NeoBridge.</p>
        </div>
        <Button asChild><Link href="/admin/api">Configurer GitHub</Link></Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <GitBranch className="h-7 w-7 text-brand" />
          <div>
            <h1 className="text-2xl font-bold">GitHub global</h1>
            <p className="text-muted-foreground text-sm mt-0.5">
              Repos visibles, derniers pushes/modifications et lien vers les projets maîtres NeoBridge.
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline"><Link href="/dashboard"><Workflow className="h-4 w-4 mr-2" />Cockpit</Link></Button>
          <Button asChild variant="outline"><Link href="/dashboard/projects-pm">Gestion PM</Link></Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">Repos visibles</p><p className="text-2xl font-bold mt-1">{overview.rows.length}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">Repos liés à NeoBridge</p><p className="text-2xl font-bold mt-1">{overview.linkedCount}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">Mouvements sur 7 jours</p><p className="text-2xl font-bold mt-1">{overview.recentChangesCount}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">Repos privés</p><p className="text-2xl font-bold mt-1">{overview.privateCount}</p></CardContent></Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Derniers pushes ou modifications</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {overview.activityRows.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucune activité GitHub récente visible.</p>
          ) : (
            overview.activityRows.map((activity) => (
              <Link key={activity.id} href={activity.href} className="block rounded-lg border p-3 hover:border-primary/50 transition-colors">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-sm">{activity.fullName}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {activity.state === 'PUSHED' ? `Push sur ${activity.branch ?? 'default'}` : 'Mise à jour GitHub'} · {activity.linkedProjectName ?? 'Non lié'}
                    </p>
                  </div>
                  <Badge variant={activity.state === 'PUSHED' ? 'default' : 'secondary'}>{activity.state}</Badge>
                </div>
                <p className="text-[11px] text-muted-foreground mt-2">{formatRelativeDate(new Date(activity.timestamp))}</p>
              </Link>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Tous les repos visibles</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {overview.rows.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">Aucun repository GitHub visible pour ce token.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Repository</TableHead>
                  <TableHead>Visibilité</TableHead>
                  <TableHead className="hidden md:table-cell">Projet NeoBridge</TableHead>
                  <TableHead className="hidden lg:table-cell">Branche</TableHead>
                  <TableHead className="text-right">Dernière activité</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {overview.rows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <a href={row.htmlUrl} target="_blank" rel="noreferrer" className="font-medium hover:underline inline-flex items-center gap-1">
                            {row.fullName}
                            <ExternalLink className="h-3 w-3" />
                          </a>
                          {row.isLinked ? <Badge>Lié</Badge> : <Badge variant="outline">Non lié</Badge>}
                        </div>
                        {row.description ? <p className="text-xs text-muted-foreground line-clamp-1">{row.description}</p> : null}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={row.isPrivate ? 'secondary' : 'outline'}>{row.visibility}</Badge>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                      {row.linkedProjectName ? (
                        <Link href={row.linkedProjectHref} className="hover:underline underline-offset-2">{row.linkedProjectName}</Link>
                      ) : 'Non lié'}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">{row.defaultBranch ?? '—'}</TableCell>
                    <TableCell className="text-right text-xs text-muted-foreground">{formatRelativeDate(row.lastActivityAt)}</TableCell>
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

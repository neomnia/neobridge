import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import { fr } from 'date-fns/locale'
import { Rocket, ExternalLink, Key } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { db } from '@/db'
import { projectApps } from '@/db/schema'
import { listVercelDeployments, listVercelTeams } from '@/lib/vercel/client'

export const metadata = { title: 'Déploiements — NeoBridge' }
export const dynamic = 'force-dynamic'

async function fetchDeploymentRows() {
  try {
    const [linkedApps, vercelTeams] = await Promise.all([
      db.select({ externalResourceId: projectApps.externalResourceId, name: projectApps.name }).from(projectApps),
      listVercelTeams(),
    ])

    const grouped = await Promise.all(
      vercelTeams.map(async (team) => {
        const deployments = await listVercelDeployments({ vercelTeamId: team.id, limit: 12 }).catch(() => [])
        return deployments.map((deployment) => ({
          ...deployment,
          teamName: team.name,
          linked: linkedApps.some((app) => app.externalResourceId === deployment.projectId || app.name === deployment.name),
        }))
      }),
    )

    return { rows: grouped.flat().sort((a, b) => b.createdAt - a.createdAt), configured: true }
  } catch {
    return { rows: [], configured: false }
  }
}

export default async function DeploymentsPage() {
  const { rows, configured } = await fetchDeploymentRows()

  if (!configured) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted">
          <Key className="h-7 w-7 text-muted-foreground" />
        </div>
        <div>
          <p className="font-semibold text-lg">Token Vercel non configuré</p>
          <p className="text-sm text-muted-foreground mt-1">Configure la connexion Vercel pour afficher les déploiements globaux.</p>
        </div>
        <Button asChild><Link href="/admin/api">Configurer Vercel</Link></Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Rocket className="h-7 w-7 text-brand" />
          <div>
            <h1 className="text-2xl font-bold">Déploiements globaux</h1>
            <p className="text-muted-foreground text-sm mt-0.5">
              {rows.length} déploiement{rows.length !== 1 ? 's' : ''} visibles depuis Vercel
            </p>
          </div>
        </div>
        <Button asChild variant="outline"><Link href="/dashboard/projects-pm">Voir la vue PM</Link></Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Activité récente</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {rows.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">Aucun déploiement récent trouvé.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Projet</TableHead>
                  <TableHead>Team</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="hidden md:table-cell">Branche</TableHead>
                  <TableHead className="hidden lg:table-cell">URL</TableHead>
                  <TableHead className="text-right">Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{row.name}</span>
                        {row.linked ? <Badge variant="default">Lié</Badge> : <Badge variant="outline">Non lié</Badge>}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{row.teamName}</TableCell>
                    <TableCell><Badge variant={row.state === 'READY' ? 'default' : row.state === 'ERROR' ? 'destructive' : 'secondary'}>{row.state}</Badge></TableCell>
                    <TableCell className="hidden md:table-cell text-sm text-muted-foreground">{row.commitRef ?? '—'}</TableCell>
                    <TableCell className="hidden lg:table-cell">
                      {row.url ? (
                        <a href={`https://${row.url}`} target="_blank" rel="noreferrer" className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
                          <span className="truncate max-w-[200px]">{row.url}</span>
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      ) : '—'}
                    </TableCell>
                    <TableCell className="text-right text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(row.createdAt), { addSuffix: true, locale: fr })}
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

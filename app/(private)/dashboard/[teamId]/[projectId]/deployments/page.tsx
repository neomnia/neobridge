import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ArrowUpRight, GitBranch, RotateCcw, Triangle } from 'lucide-react'
import { serviceApiRepository } from '@/lib/services'
import { resolveVercelProject, listVercelDeployments, type VercelDeployment } from '@/lib/connectors/vercel'
import { formatDistanceToNow, format } from 'date-fns'
import { fr } from 'date-fns/locale'

const STATE_VARIANT: Record<string, 'default' | 'secondary' | 'outline' | 'destructive'> = {
  READY:    'default',
  ERROR:    'destructive',
  BUILDING: 'secondary',
  QUEUED:   'outline',
  CANCELED: 'outline',
}
const STATE_LABEL: Record<string, string> = {
  READY:    'En ligne',
  ERROR:    'Erreur',
  BUILDING: 'Build…',
  QUEUED:   'En attente',
  CANCELED: 'Annulé',
}

async function fetchDeployments(teamSlug: string, projectName: string): Promise<VercelDeployment[]> {
  try {
    const config = await serviceApiRepository.getConfig('vercel', 'production')
    const token = (config?.config as Record<string, unknown> | undefined)?.apiToken as string ?? null
    if (!token) return []
    const ids = await resolveVercelProject(teamSlug, projectName, token)
    if (!ids) return []
    return await listVercelDeployments(ids.vercelProjectId, ids.vercelTeamId, token, 25)
  } catch { return [] }
}

export default async function DeploymentsPage({
  params,
}: {
  params: Promise<{ teamId: string; projectId: string }>
}) {
  const { teamId, projectId } = await params
  const deployments = await fetchDeployments(teamId, projectId)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Triangle className="h-5 w-5 text-muted-foreground" />
            Déploiements
          </h2>
          <p className="text-muted-foreground text-sm mt-0.5">
            {deployments.length} déploiement{deployments.length !== 1 ? 's' : ''} — Vercel
          </p>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          {deployments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
              <Triangle className="h-10 w-10 text-muted-foreground" />
              <p className="text-muted-foreground">
                Aucun déploiement —{' '}
                <Link href="/admin/api" className="underline underline-offset-2">
                  vérifier le token Vercel
                </Link>
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Statut</TableHead>
                  <TableHead>Branche / Nom</TableHead>
                  <TableHead className="hidden md:table-cell">URL</TableHead>
                  <TableHead className="hidden lg:table-cell">Durée</TableHead>
                  <TableHead className="text-right">Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {deployments.map((d) => {
                  const duration = d.readyAt && d.createdAt
                    ? Math.round((d.readyAt - d.createdAt) / 1000)
                    : null
                  return (
                    <TableRow key={d.uid}>
                      <TableCell>
                        <Badge variant={STATE_VARIANT[d.state] ?? 'outline'} className="text-xs">
                          {STATE_LABEL[d.state] ?? d.state}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <GitBranch className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          <span className="text-sm font-mono truncate max-w-[160px]">{d.name}</span>
                        </div>
                        {d.target && (
                          <span className="text-xs text-muted-foreground ml-5">{d.target}</span>
                        )}
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        {d.url && (
                          <a
                            href={`https://${d.url}`}
                            target="_blank"
                            rel="noreferrer"
                            className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
                          >
                            <span className="truncate max-w-[200px]">{d.url}</span>
                            <ArrowUpRight className="h-3 w-3 shrink-0" />
                          </a>
                        )}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-xs text-muted-foreground">
                        {duration != null ? `${duration}s` : '—'}
                      </TableCell>
                      <TableCell className="text-right">
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                          {formatDistanceToNow(new Date(d.createdAt), { addSuffix: true, locale: fr })}
                        </span>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Rocket, GitBranch, ArrowUpRight, Key } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { serviceApiRepository } from '@/lib/services'
import { syncVercelTeams, listAllVercelDeployments } from '@/lib/connectors/vercel'
import { formatDistanceToNow } from 'date-fns'
import { fr } from 'date-fns/locale'

export const metadata = { title: 'Déploiements — NeoBridge' }
export const dynamic = 'force-dynamic'

const STATE_VARIANT: Record<string, 'default' | 'secondary' | 'outline' | 'destructive'> = {
  READY: 'default', ERROR: 'destructive', BUILDING: 'secondary',
  QUEUED: 'outline', CANCELED: 'outline',
}
const STATE_LABEL: Record<string, string> = {
  READY: 'En ligne', ERROR: 'Erreur', BUILDING: 'Build…',
  QUEUED: 'En attente', CANCELED: 'Annulé',
}

interface DeploymentRow {
  uid: string; name: string; url: string; state: string
  target: string | null; createdAt: number; readyAt: number | null
  teamSlug: string
}

async function fetchDeployments(): Promise<DeploymentRow[] | null> {
  try {
    const config = await serviceApiRepository.getConfig('vercel', 'production')
    const token = (config?.config as Record<string, unknown>)?.apiToken as string | undefined
    if (!token) return null
    const teams = await syncVercelTeams(token)
    if (!teams.length) return null
    const grouped = await Promise.all(
      teams.map(async (team) => {
        const deployments = await listAllVercelDeployments(team.id, token, 30)
        return deployments.map((d) => ({ ...d, teamSlug: team.slug }))
      }),
    )
    return grouped.flat().sort((a, b) => b.createdAt - a.createdAt).slice(0, 50)
  } catch { return null }
}

export default async function DeploymentsPage() {
  const deployments = await fetchDeployments()

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Rocket className="h-6 w-6 text-muted-foreground" />
        <div>
          <h1 className="text-2xl font-bold">Déploiements</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {deployments ? `${deployments.length} déploiements récents · Vercel` : 'Token Vercel requis'}
          </p>
        </div>
      </div>

      {deployments === null && (
        <div className="flex flex-col items-center justify-center border border-dashed rounded-lg py-20 text-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            <Key className="h-6 w-6 text-muted-foreground" />
          </div>
          <p className="font-medium">Token Vercel non configuré</p>
          <Button asChild><Link href="/admin/api">Configurer Vercel</Link></Button>
        </div>
      )}

      {deployments !== null && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Tous les déploiements</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {deployments.length === 0 ? (
              <p className="text-sm text-muted-foreground px-6 pb-6">Aucun déploiement trouvé.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Statut</TableHead>
                    <TableHead>Projet</TableHead>
                    <TableHead className="hidden md:table-cell">Branche</TableHead>
                    <TableHead className="hidden lg:table-cell">URL</TableHead>
                    <TableHead className="hidden sm:table-cell">Cible</TableHead>
                    <TableHead className="text-right">Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {deployments.map((d) => (
                    <TableRow key={d.uid}>
                      <TableCell>
                        <Badge variant={STATE_VARIANT[d.state] ?? 'outline'} className="text-xs">
                          {STATE_LABEL[d.state] ?? d.state}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Link
                          href={`/dashboard/${d.teamSlug}/${d.name}/deployments`}
                          className="font-medium text-sm hover:underline"
                        >
                          {d.name}
                        </Link>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <span className="flex items-center gap-1.5 text-xs font-mono text-muted-foreground">
                          <GitBranch className="h-3 w-3" />
                          {d.name}
                        </span>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        {d.url && (
                          <a href={`https://${d.url}`} target="_blank" rel="noreferrer"
                            className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
                            {d.url.length > 35 ? `${d.url.slice(0, 35)}…` : d.url}
                            <ArrowUpRight className="h-3 w-3 shrink-0" />
                          </a>
                        )}
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <Badge variant="outline" className="text-xs">
                          {d.target ?? 'preview'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right text-xs text-muted-foreground whitespace-nowrap">
                        {formatDistanceToNow(new Date(d.createdAt), { addSuffix: true, locale: fr })}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}

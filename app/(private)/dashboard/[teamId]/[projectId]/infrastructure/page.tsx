import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ArrowUpRight, GitBranch, Plus, Server, Triangle } from 'lucide-react'
import { serviceApiRepository } from '@/lib/services'
import {
  syncVercelTeams,
  listVercelProjects,
  listVercelDeployments,
  resolveVercelProject,
  type VercelDeployment,
} from '@/lib/connectors/vercel'
import { formatDistanceToNow } from 'date-fns'
import { fr } from 'date-fns/locale'
import { ResourcesSection } from '@/components/neobridge/resources/ResourcesSection'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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

async function fetchVercelToken(): Promise<string | null> {
  try {
    const config = await serviceApiRepository.getConfig('vercel', 'production')
    return (config?.config as Record<string, unknown> | undefined)?.apiToken as string ?? null
  } catch { return null }
}

async function fetchRecentDeployments(
  teamSlug: string,
  projectName: string,
): Promise<VercelDeployment[]> {
  try {
    const token = await fetchVercelToken()
    if (!token) return []
    const ids = await resolveVercelProject(teamSlug, projectName, token)
    if (!ids) return []
    return await listVercelDeployments(ids.vercelProjectId, ids.vercelTeamId, token, 8)
  } catch { return [] }
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function InfrastructurePage({
  params,
}: {
  params: Promise<{ teamId: string; projectId: string }>
}) {
  const { teamId, projectId } = await params
  const deployments = await fetchRecentDeployments(teamId, projectId)

  return (
    <div className="space-y-8">

      {/* ── Déploiements récents ──────────────────────────────── */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Triangle className="h-4 w-4 text-muted-foreground" />
              Déploiements récents
            </CardTitle>
            <Button asChild variant="ghost" size="sm" className="text-xs text-muted-foreground h-7">
              <Link href={`/dashboard/${teamId}/${projectId}/deployments`}>
                Voir tout <ArrowUpRight className="h-3 w-3 ml-1" />
              </Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {deployments.length === 0 ? (
            <p className="text-sm text-muted-foreground px-6 pb-6">
              Aucun déploiement — vérifiez votre token Vercel dans{' '}
              <Link href="/admin/api" className="underline underline-offset-2">Gestion des API</Link>.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Statut</TableHead>
                  <TableHead>Branche</TableHead>
                  <TableHead className="hidden sm:table-cell">URL</TableHead>
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
                      <span className="flex items-center gap-1.5 text-sm font-mono text-muted-foreground">
                        <GitBranch className="h-3.5 w-3.5" />
                        {d.name}
                      </span>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      {d.url && (
                        <a
                          href={`https://${d.url}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
                        >
                          {d.url.length > 40 ? `${d.url.slice(0, 40)}…` : d.url}
                          <ArrowUpRight className="h-3 w-3 shrink-0" />
                        </a>
                      )}
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

      {/* ── Ressources mappées ───────────────────────────────── */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Server className="h-4 w-4 text-muted-foreground" />
              Ressources mappées
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <ResourcesSection projectId={projectId} />
        </CardContent>
      </Card>

      {/* ── Coûts & Services ─────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="text-base">Coûts & Services</CardTitle>
            <Button asChild variant="ghost" size="sm" className="text-xs text-muted-foreground h-7">
              <Link href={`/dashboard/${teamId}/${projectId}/costs`}>
                Détails <ArrowUpRight className="h-3 w-3 ml-1" />
              </Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Service</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Région</TableHead>
                <TableHead className="text-right">Statut</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell className="font-medium">Vercel</TableCell>
                <TableCell className="text-muted-foreground text-sm">Pro</TableCell>
                <TableCell className="text-muted-foreground text-sm">IAD1 (Washington)</TableCell>
                <TableCell className="text-right">
                  <Badge variant="default" className="text-xs">Actif</Badge>
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">Neon</TableCell>
                <TableCell className="text-muted-foreground text-sm">—</TableCell>
                <TableCell className="text-muted-foreground text-sm">—</TableCell>
                <TableCell className="text-right">
                  <Badge variant="outline" className="text-xs">À configurer</Badge>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>

    </div>
  )
}

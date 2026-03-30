import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Globe, ShieldCheck, ShieldOff, ArrowUpRight, Plus } from 'lucide-react'
import { serviceApiRepository } from '@/lib/services'
import { resolveVercelProject, listProjectDomains, type VercelDomain } from '@/lib/connectors/vercel'
import { formatDistanceToNow } from 'date-fns'
import { fr } from 'date-fns/locale'

async function fetchDomains(teamSlug: string, projectName: string): Promise<VercelDomain[]> {
  try {
    const config = await serviceApiRepository.getConfig('vercel', 'production')
    const token = (config?.config as Record<string, unknown> | undefined)?.apiToken as string ?? null
    if (!token) return []
    const ids = await resolveVercelProject(teamSlug, projectName, token)
    if (!ids) return []
    return await listProjectDomains(ids.vercelProjectId, ids.vercelTeamId, token)
  } catch { return [] }
}

export default async function DomainsPage({
  params,
}: {
  params: Promise<{ teamId: string; projectId: string }>
}) {
  const { teamId, projectId } = await params
  const domains = await fetchDomains(teamId, projectId)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Globe className="h-5 w-5 text-muted-foreground" />
            Gestion des domaines
          </h2>
          <p className="text-muted-foreground text-sm mt-0.5">
            {domains.length} domaine{domains.length !== 1 ? 's' : ''} configuré{domains.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Button size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Ajouter un domaine
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {domains.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
              <Globe className="h-10 w-10 text-muted-foreground" />
              <div>
                <p className="font-medium text-sm">Aucun domaine configuré</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Ajoutez un domaine personnalisé à ce projet Vercel.
                </p>
              </div>
              <Button size="sm" variant="outline">
                <Plus className="h-4 w-4 mr-2" />Ajouter un domaine
              </Button>
              {domains.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  <Link href="/admin/api" className="underline underline-offset-2">
                    Vérifier le token Vercel
                  </Link>{' '}
                  si aucun domaine n&apos;apparaît.
                </p>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Domaine</TableHead>
                  <TableHead>SSL</TableHead>
                  <TableHead className="hidden sm:table-cell">Branche</TableHead>
                  <TableHead className="hidden md:table-cell">Ajouté</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {domains.map((d) => (
                  <TableRow key={d.name}>
                    <TableCell>
                      <div>
                        <p className="font-medium text-sm">{d.name}</p>
                        {d.apexName !== d.name && (
                          <p className="text-xs text-muted-foreground">{d.apexName}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {d.verified ? (
                        <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 text-xs">
                          <ShieldCheck className="h-4 w-4" />Actif
                        </span>
                      ) : (
                        <span className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 text-xs">
                          <ShieldOff className="h-4 w-4" />En attente
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">
                      {d.gitBranch ?? '—'}
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-xs text-muted-foreground whitespace-nowrap">
                      {formatDistanceToNow(new Date(d.createdAt), { addSuffix: true, locale: fr })}
                    </TableCell>
                    <TableCell className="text-right">
                      <a
                        href={`https://${d.name}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                      >
                        Ouvrir <ArrowUpRight className="h-3 w-3" />
                      </a>
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

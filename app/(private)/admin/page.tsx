import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import {
  Activity,
  ArrowUpRight,
  Bot,
  BarChart3,
  CheckCircle2,
  Circle,
  Clock,
  Database,
  GitBranch,
  Globe,
  Key,
  Server,
  Triangle,
  XCircle,
  AlertCircle,
  FileText,
} from 'lucide-react'
import { db } from '@/db'
import { serviceApiConfigs } from '@/db/schema'
import { desc } from 'drizzle-orm'
import { getSystemLogs } from '@/app/actions/logs'
import { serviceApiRepository } from '@/lib/services'
import { syncVercelTeams, listVercelProjects } from '@/lib/connectors/vercel'
import { formatDistanceToNow } from 'date-fns'
import { fr } from 'date-fns/locale'
import { BusinessDashboard } from '@/components/admin/business-dashboard'
import { cn } from '@/lib/utils'

export const metadata = { title: 'Ops Center — NeoBridge Admin' }

// ---------------------------------------------------------------------------
// Types & constants
// ---------------------------------------------------------------------------

interface ServiceStatus {
  id: string
  label: string
  icon: React.ElementType
  configured: boolean
  active: boolean
  lastTestedAt: Date | null
}

const NEOBRIDGE_SERVICES: Pick<ServiceStatus, 'id' | 'label' | 'icon'>[] = [
  { id: 'vercel',    label: 'Vercel',    icon: Triangle  },
  { id: 'github',    label: 'GitHub',    icon: GitBranch },
  { id: 'anthropic', label: 'Anthropic', icon: Bot       },
  { id: 'neon',      label: 'Neon',      icon: Database  },
  { id: 'notion',    label: 'Notion',    icon: FileText  },
  { id: 'railway',   label: 'Railway',   icon: Server    },
  { id: 'temporal',  label: 'Temporal',  icon: Clock     },
  { id: 'zoho',      label: 'Zoho CRM',  icon: BarChart3 },
]

const DEPLOY_VARIANT: Record<string, 'default' | 'secondary' | 'outline' | 'destructive'> = {
  READY:    'default',
  ERROR:    'destructive',
  BUILDING: 'secondary',
  QUEUED:   'outline',
  CANCELED: 'outline',
}
const DEPLOY_LABEL: Record<string, string> = {
  READY: 'En ligne', ERROR: 'Erreur', BUILDING: 'Build…', QUEUED: 'En attente', CANCELED: 'Annulé',
}

const LOG_VARIANT: Record<string, 'destructive' | 'outline' | 'secondary'> = {
  error:   'destructive',
  warning: 'outline',
  info:    'secondary',
  debug:   'outline',
}

// ---------------------------------------------------------------------------
// Data fetchers
// ---------------------------------------------------------------------------

async function fetchServiceStatuses(): Promise<ServiceStatus[]> {
  try {
    const rows = await db
      .select({
        serviceName: serviceApiConfigs.serviceName,
        isActive:    serviceApiConfigs.isActive,
        lastTestedAt: serviceApiConfigs.lastTestedAt,
      })
      .from(serviceApiConfigs)
      .orderBy(desc(serviceApiConfigs.updatedAt))

    const configuredMap = new Map<string, { active: boolean; lastTestedAt: Date | null }>()
    for (const row of rows) {
      if (!configuredMap.has(row.serviceName)) {
        configuredMap.set(row.serviceName, {
          active: row.isActive,
          lastTestedAt: row.lastTestedAt,
        })
      }
    }

    return NEOBRIDGE_SERVICES.map((s) => {
      const found = configuredMap.get(s.id)
      return {
        ...s,
        configured: !!found,
        active: found?.active ?? false,
        lastTestedAt: found?.lastTestedAt ?? null,
      }
    })
  } catch {
    return NEOBRIDGE_SERVICES.map((s) => ({ ...s, configured: false, active: false, lastTestedAt: null }))
  }
}

interface ProjectCard {
  id: string
  name: string
  framework: string | null
  deployState: string | null
  teamSlug: string
  updatedAt: number
}

async function fetchRecentProjects(): Promise<ProjectCard[]> {
  try {
    const config = await serviceApiRepository.getConfig('vercel', 'production')
    const token = (config?.config as Record<string, unknown> | undefined)?.apiToken as string | undefined
    if (!token) return []

    const teams = await syncVercelTeams(token)
    const grouped = await Promise.all(
      teams.map(async (team) => {
        const projects = await listVercelProjects(team.id, token)
        return projects.map<ProjectCard>((p) => ({
          id:          p.id,
          name:        p.name,
          framework:   p.framework,
          deployState: p.latestDeployments?.[0]?.readyState ?? null,
          teamSlug:    team.slug,
          updatedAt:   p.updatedAt,
        }))
      }),
    )
    return grouped.flat().sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 6)
  } catch { return [] }
}

async function fetchRecentLogs() {
  try {
    const result = await getSystemLogs({})
    if (!result.success) return []
    return (result.data ?? []).slice(0, 10)
  } catch { return [] }
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function AdminPage() {
  const [services, projects, logs] = await Promise.all([
    fetchServiceStatuses(),
    fetchRecentProjects(),
    fetchRecentLogs(),
  ])

  const configuredCount = services.filter((s) => s.configured && s.active).length
  const errorCount      = logs.filter((l) => l.level === 'error').length
  const onlineCount     = projects.filter((p) => p.deployState === 'READY').length

  return (
    <div className="space-y-8">

      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">NeoBridge Ops Center</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Supervision en temps réel — APIs, projets, logs et coûts
          </p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href="/admin/api">
            <Key className="h-4 w-4 mr-2" />Gérer les APIs
          </Link>
        </Button>
      </div>

      {/* ── KPIs résumé ─────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'APIs configurées', value: `${configuredCount}/${services.length}`, icon: CheckCircle2, color: 'text-emerald-500' },
          { label: 'Projets en ligne', value: `${onlineCount}/${projects.length}`,     icon: Globe,         color: 'text-blue-500'   },
          { label: 'Erreurs récentes', value: errorCount,                              icon: XCircle,       color: errorCount > 0 ? 'text-red-500' : 'text-muted-foreground' },
          { label: 'Services actifs',  value: configuredCount,                         icon: Activity,      color: 'text-brand'      },
        ].map(({ label, value, icon: Icon, color }) => (
          <Card key={label}>
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-muted-foreground">{label}</span>
                <Icon className={cn('h-4 w-4', color)} />
              </div>
              <p className="text-2xl font-bold">{value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ── Statut des APIs ─────────────────────────────────────── */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold flex items-center gap-2">
            <Key className="h-4 w-4 text-muted-foreground" />
            Statut des APIs
          </h2>
          <Link href="/admin/api" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
            Configurer →
          </Link>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {services.map(({ id, label, icon: Icon, configured, active, lastTestedAt }) => (
            <Card key={id} className={cn('transition-colors', !configured && 'opacity-55')}>
              <CardContent className="pt-3 pb-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                  </div>
                  {configured && active ? (
                    <span className="flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                      <Circle className="h-2 w-2 fill-emerald-500" />Actif
                    </span>
                  ) : configured && !active ? (
                    <span className="flex items-center gap-1 text-[10px] text-amber-600 font-medium">
                      <Circle className="h-2 w-2 fill-amber-500" />Inactif
                    </span>
                  ) : (
                    <Badge variant="outline" className="text-[10px] h-4">Non configuré</Badge>
                  )}
                </div>
                <p className="font-semibold text-sm">{label}</p>
                {lastTestedAt ? (
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    Testé {formatDistanceToNow(new Date(lastTestedAt), { addSuffix: true, locale: fr })}
                  </p>
                ) : (
                  <p className="text-[10px] text-muted-foreground mt-0.5">Jamais testé</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* ── Projets + Logs côte à côte ──────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Projets récents */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-semibold flex items-center gap-2">
              <Triangle className="h-4 w-4 text-muted-foreground" />
              Projets récents
            </h2>
            <Link href="/dashboard" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
              Voir tous →
            </Link>
          </div>
          <Card>
            <CardContent className="p-0">
              {projects.length === 0 ? (
                <div className="flex flex-col items-center py-10 gap-2 text-center px-4">
                  <AlertCircle className="h-8 w-8 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">Token Vercel non configuré</p>
                  <Button asChild size="sm" variant="outline">
                    <Link href="/admin/api">Configurer</Link>
                  </Button>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Projet</TableHead>
                      <TableHead>Statut</TableHead>
                      <TableHead className="text-right">Modifié</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {projects.map((p) => (
                      <TableRow key={p.id}>
                        <TableCell>
                          <Link
                            href={`/dashboard/${p.teamSlug}/${p.name}/infrastructure`}
                            className="flex items-center gap-1.5 font-medium text-sm hover:text-brand transition-colors"
                          >
                            {p.name}
                            <ArrowUpRight className="h-3 w-3 text-muted-foreground" />
                          </Link>
                          {p.framework && (
                            <span className="text-xs text-muted-foreground">{p.framework}</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {p.deployState ? (
                            <Badge variant={DEPLOY_VARIANT[p.deployState] ?? 'outline'} className="text-xs">
                              {DEPLOY_LABEL[p.deployState] ?? p.deployState}
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-xs">—</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right text-xs text-muted-foreground whitespace-nowrap">
                          {formatDistanceToNow(new Date(p.updatedAt), { addSuffix: true, locale: fr })}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </section>

        {/* Logs récents */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-semibold flex items-center gap-2">
              <Activity className="h-4 w-4 text-muted-foreground" />
              Logs système récents
            </h2>
            <Link href="/admin/logs" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
              Voir tous →
            </Link>
          </div>
          <Card>
            <CardContent className="p-0">
              {logs.length === 0 ? (
                <p className="text-sm text-muted-foreground py-10 text-center px-4">Aucun log système enregistré.</p>
              ) : (
                <div className="divide-y divide-border font-mono text-xs">
                  {logs.map((log) => (
                    <div key={log.id} className="flex items-start gap-2.5 px-4 py-2.5 hover:bg-muted/30 transition-colors">
                      <Badge variant={LOG_VARIANT[log.level] ?? 'outline'} className="text-[9px] h-4 shrink-0 mt-0.5">
                        {log.level.toUpperCase()}
                      </Badge>
                      <span className="text-muted-foreground shrink-0">[{log.category}]</span>
                      <span className="flex-1 break-all text-foreground/80">{log.message}</span>
                      <span className="text-muted-foreground whitespace-nowrap shrink-0">
                        {formatDistanceToNow(new Date(log.createdAt), { addSuffix: true, locale: fr })}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </section>
      </div>

      {/* ── Coûts & Services ────────────────────────────────────── */}
      <section>
        <h2 className="text-base font-semibold mb-3">Coûts & Services</h2>
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Service</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Région</TableHead>
                  <TableHead className="text-right">Statut</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {[
                  { name: 'Vercel',    type: 'Déploiement',   plan: 'Pro',           region: 'IAD1 (Washington)', configured: services.find(s => s.id === 'vercel')?.configured ?? false },
                  { name: 'Neon',      type: 'Base de données', plan: '—',           region: '—',                 configured: services.find(s => s.id === 'neon')?.configured ?? false   },
                  { name: 'GitHub',    type: 'Code',          plan: '—',             region: 'Global',            configured: services.find(s => s.id === 'github')?.configured ?? false  },
                  { name: 'Anthropic', type: 'IA',            plan: 'Pay-as-you-go', region: 'Global',            configured: services.find(s => s.id === 'anthropic')?.configured ?? false },
                  { name: 'Temporal',  type: 'Workflows',     plan: '—',             region: '—',                 configured: services.find(s => s.id === 'temporal')?.configured ?? false },
                  { name: 'Zoho',      type: 'CRM',           plan: '—',             region: '—',                 configured: services.find(s => s.id === 'zoho')?.configured ?? false    },
                ].map(({ name, type, plan, region, configured }) => (
                  <TableRow key={name} className={!configured ? 'opacity-50' : ''}>
                    <TableCell className="font-medium">{name}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{type}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{plan}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{region}</TableCell>
                    <TableCell className="text-right">
                      {configured
                        ? <Badge variant="default" className="text-xs">Actif</Badge>
                        : <Badge variant="outline" className="text-xs">À configurer</Badge>
                      }
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </section>

      {/* ── Business Dashboard ──────────────────────────────────── */}
      <div>
        <Separator className="mb-6" />
        <div className="mb-4">
          <h2 className="text-base font-semibold">Business Analytics</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Paiements, commandes et abonnements NeoSaaS</p>
        </div>
        <BusinessDashboard />
      </div>

    </div>
  )
}

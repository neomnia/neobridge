import Link from 'next/link'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ImpersonationBanner } from '@/components/admin/impersonation-banner'
import {
  Key,
  LayoutGrid,
  Activity,
  Plus,
  ArrowRight,
  Zap,
  Database,
  Bot,
  GitBranch,
  Circle,
} from 'lucide-react'
import { serviceApiRepository } from '@/lib/services'
import { syncVercelTeams, listVercelProjects } from '@/lib/connectors/vercel'
import { formatDistanceToNow } from 'date-fns'
import { fr } from 'date-fns/locale'
import { SpendingSection } from '@/components/dashboard/spending-section'
import { PulseMonitor } from '@/components/dashboard/pulse-monitor'
import { Separator } from '@/components/ui/separator'
import { db } from '@/db'
import { serviceApiConfigs } from '@/db/schema'

export const metadata = { title: 'Dashboard — NeoBridge' }
export const dynamic = 'force-dynamic'
export const revalidate = 0

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ProjectCard {
  id: string
  name: string
  framework: string | null
  updatedAt: number
  deployState: string | null
  deployUrl: string | null
  teamSlug: string
  teamName: string
}

interface ServiceHealth {
  name: string
  label: string
  icon: React.ReactNode
  active: boolean
  lastTestedAt: Date | null
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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

async function fetchAllProjects(): Promise<ProjectCard[] | null> {
  try {
    const config = await serviceApiRepository.getConfig('vercel', 'production')
    const token = (config?.config as Record<string, unknown> | undefined)?.apiToken as string | undefined
    if (!token) return null

    const teams = await syncVercelTeams(token)
    if (teams.length === 0) return null

    const grouped = await Promise.all(
      teams.map(async (team) => {
        const projects = await listVercelProjects(team.id, token)
        return projects.map<ProjectCard>((p) => ({
          id:          p.id,
          name:        p.name,
          framework:   p.framework,
          updatedAt:   p.updatedAt,
          deployState: p.latestDeployments?.[0]?.readyState ?? null,
          deployUrl:   p.latestDeployments?.[0]?.url ?? null,
          teamSlug:    team.slug,
          teamName:    team.name,
        }))
      }),
    )

    return grouped.flat().sort((a, b) => b.updatedAt - a.updatedAt)
  } catch {
    return null
  }
}

async function fetchServiceHealth(): Promise<ServiceHealth[]> {
  try {
    const rows = await db
      .select({
        serviceName:  serviceApiConfigs.serviceName,
        isActive:     serviceApiConfigs.isActive,
        lastTestedAt: serviceApiConfigs.lastTestedAt,
      })
      .from(serviceApiConfigs)

    const byName: Record<string, { active: boolean; lastTestedAt: Date | null }> = {}
    for (const row of rows) {
      if (!byName[row.serviceName] || row.isActive) {
        byName[row.serviceName] = { active: row.isActive, lastTestedAt: row.lastTestedAt }
      }
    }

    const TRACKED = [
      { name: 'vercel',    label: 'Vercel',    icon: <Zap className="h-3.5 w-3.5" /> },
      { name: 'neon',      label: 'Neon DB',   icon: <Database className="h-3.5 w-3.5" /> },
      { name: 'anthropic', label: 'Anthropic', icon: <Bot className="h-3.5 w-3.5" /> },
      { name: 'github',    label: 'GitHub',    icon: <GitBranch className="h-3.5 w-3.5" /> },
    ]

    return TRACKED.map((svc) => ({
      ...svc,
      active:      byName[svc.name]?.active ?? false,
      lastTestedAt: byName[svc.name]?.lastTestedAt ?? null,
    }))
  } catch {
    return []
  }
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function DashboardPage() {
  const [projects, services] = await Promise.all([
    fetchAllProjects(),
    fetchServiceHealth(),
  ])

  const recentProjects = projects?.slice(0, 4) ?? []
  const totalProjects  = projects?.length ?? 0

  return (
    <div className="space-y-8">
      <ImpersonationBanner />

      {/* ── Zone 1 : Dépenses ──────────────────────────────── */}
      <SpendingSection />

      <Separator />

      {/* ── Zone 2 : État des services ─────────────────────── */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Activity className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-lg font-semibold">État des services</h2>
        </div>
        <div className="flex flex-wrap gap-3">
          {services.map((svc) => (
            <div
              key={svc.name}
              className="flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm bg-card"
            >
              <Circle
                className={`h-2 w-2 fill-current ${
                  svc.active ? 'text-green-500' : 'text-muted-foreground/40'
                }`}
              />
              {svc.icon}
              <span className="font-medium">{svc.label}</span>
              {svc.lastTestedAt && (
                <span className="text-[10px] text-muted-foreground">
                  {formatDistanceToNow(new Date(svc.lastTestedAt), {
                    addSuffix: true,
                    locale: fr,
                  })}
                </span>
              )}
              <Badge
                variant={svc.active ? 'default' : 'outline'}
                className={`text-[10px] px-1.5 py-0 h-4 ${
                  svc.active
                    ? 'bg-green-500/15 text-green-700 hover:bg-green-500/15 border-transparent'
                    : ''
                }`}
              >
                {svc.active ? 'actif' : 'inactif'}
              </Badge>
            </div>
          ))}
          {services.length === 0 && (
            <p className="text-sm text-muted-foreground">Aucun service configuré.</p>
          )}
        </div>
      </div>

      <Separator />

      {/* ── Zone 3 : Projets récents ───────────────────────── */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <LayoutGrid className="h-5 w-5 text-muted-foreground" />
            <h2 className="text-lg font-semibold">Projets récents</h2>
            {totalProjects > 0 && (
              <Badge variant="outline" className="text-xs">{totalProjects}</Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" className="h-8 gap-1.5" asChild>
              <Link href="/dashboard/new">
                <Plus className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Nouveau</span>
              </Link>
            </Button>
            {totalProjects > 4 && (
              <Button size="sm" variant="ghost" className="h-8 gap-1.5 text-brand" asChild>
                <Link href="/dashboard/projects">
                  Voir tout
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </Button>
            )}
          </div>
        </div>

        {projects === null && (
          <div className="flex flex-col items-center justify-center border border-dashed rounded-lg py-12 text-center gap-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
              <Key className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <p className="font-medium text-sm">Token Vercel non configuré</p>
              <p className="text-xs text-muted-foreground mt-1">
                Configurez votre token dans Gestion des API pour voir vos projets.
              </p>
            </div>
            <Button size="sm" asChild>
              <Link href="/admin/api">Configurer Vercel →</Link>
            </Button>
          </div>
        )}

        {projects !== null && recentProjects.length === 0 && (
          <p className="text-sm text-muted-foreground">Aucun projet trouvé sur Vercel.</p>
        )}

        {recentProjects.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {recentProjects.map((project) => (
              <Link
                key={project.id}
                href={`/dashboard/${project.teamSlug}/${project.name}/infrastructure`}
              >
                <Card className="hover:border-brand/50 transition-colors cursor-pointer h-full">
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-sm truncate">{project.name}</h3>
                        {project.framework && (
                          <p className="text-xs text-muted-foreground mt-0.5">{project.framework}</p>
                        )}
                      </div>
                      {project.deployState && (
                        <Badge
                          variant={DEPLOY_VARIANT[project.deployState] ?? 'outline'}
                          className="shrink-0 text-[10px] px-1.5"
                        >
                          {DEPLOY_LABEL[project.deployState] ?? project.deployState}
                        </Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(project.updatedAt), {
                          addSuffix: true,
                          locale: fr,
                        })}
                      </p>
                      <Badge variant="outline" className="text-[10px] font-mono shrink-0 px-1.5">
                        {project.teamSlug}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>

      <Separator />

      {/* ── Zone 4 : Le Pulse + Ghost Dev Monitor ─────────── */}
      <div className="space-y-3">
        <PulseMonitor />
      </div>
    </div>
  )
}

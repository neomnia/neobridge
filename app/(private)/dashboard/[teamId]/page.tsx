import Link from 'next/link'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Plus, ExternalLink, Triangle, Database, GitBranch } from 'lucide-react'
import { serviceApiRepository } from '@/lib/services'
import { syncVercelTeams, listVercelProjects } from '@/lib/connectors/vercel'
import { formatDistanceToNow } from 'date-fns'
import { fr } from 'date-fns/locale'
import { db } from '@/db'
import { apiCredentials, teams } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { cn } from '@/lib/utils'

export const metadata = { title: "Vue d'ensemble — NeoBridge" }

// ---------------------------------------------------------------------------
// Types & constants
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

const SERVICES = [
  { id: 'vercel', label: 'Vercel',  icon: Triangle,   description: 'Déploiements & Edge Network', href: 'https://vercel.com/dashboard' },
  { id: 'neon',   label: 'Neon',    icon: Database,   description: 'PostgreSQL serverless',        href: 'https://console.neon.tech'    },
  { id: 'github', label: 'GitHub',  icon: GitBranch,  description: 'Dépôts & CI/CD',              href: 'https://github.com'           },
]

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------

async function fetchTeamProjects(teamSlug: string) {
  try {
    const config = await serviceApiRepository.getConfig('vercel', 'production')
    const token = (config?.config as Record<string, unknown> | undefined)?.apiToken as string | undefined
    if (!token) return null

    const vercelTeams = await syncVercelTeams(token)
    const team = vercelTeams.find((t) => t.slug === teamSlug)
    if (!team) return null

    const projects = await listVercelProjects(team.id, token)
    return {
      teamName: team.name,
      projects: projects.sort((a, b) => b.updatedAt - a.updatedAt),
    }
  } catch {
    return null
  }
}

async function fetchConfiguredServices(teamSlug: string) {
  try {
    const rows = await db
      .select({ type: apiCredentials.type })
      .from(apiCredentials)
      .innerJoin(teams, eq(apiCredentials.teamId, teams.id))
      .where(eq(teams.slug, teamSlug))
    return new Set(rows.map((r) => r.type))
  } catch {
    return new Set<string>()
  }
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function TeamPage({
  params,
}: {
  params: Promise<{ teamId: string }>
}) {
  const { teamId } = await params
  const [vercelData, configuredServices] = await Promise.all([
    fetchTeamProjects(teamId),
    fetchConfiguredServices(teamId),
  ])

  const projects = vercelData?.projects ?? []
  const recentProjects = projects.slice(0, 5)

  return (
    <div className="space-y-8">
      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Vue d&apos;ensemble</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {vercelData
              ? `${projects.length} projet${projects.length !== 1 ? 's' : ''} · ${vercelData.teamName}`
              : <span className="font-mono">{teamId}</span>}
          </p>
        </div>
        <Button asChild>
          <Link href={`/dashboard/${teamId}/new`}>
            <Plus className="h-4 w-4 mr-2" />
            Nouveau projet
          </Link>
        </Button>
      </div>

      {/* ── Projets récents ─────────────────────────────────── */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold">Projets récents</h2>
          {projects.length > 5 && (
            <Link href="/dashboard" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
              Voir tout ({projects.length}) →
            </Link>
          )}
        </div>

        {projects.length === 0 ? (
          <div className="flex flex-col items-center justify-center border border-dashed rounded-lg py-16 text-center">
            <p className="text-muted-foreground font-medium">Aucun projet sur Vercel</p>
            <Button asChild className="mt-4" variant="outline">
              <Link href="/admin/api">Configurer Vercel →</Link>
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {recentProjects.map((project) => (
              <Link key={project.id} href={`/dashboard/${teamId}/${project.name}/infrastructure`}>
                <Card className="hover:border-primary/50 transition-colors cursor-pointer h-full">
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-base truncate">{project.name}</h3>
                        {project.framework && (
                          <p className="text-xs text-muted-foreground mt-0.5">{project.framework}</p>
                        )}
                      </div>
                      {project.latestDeployments?.[0]?.readyState && (
                        <Badge
                          variant={DEPLOY_VARIANT[project.latestDeployments[0].readyState] ?? 'outline'}
                          className="shrink-0 text-xs"
                        >
                          {DEPLOY_LABEL[project.latestDeployments[0].readyState] ?? project.latestDeployments[0].readyState}
                        </Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(project.updatedAt), { addSuffix: true, locale: fr })}
                    </p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* ── Services connectés ──────────────────────────────── */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold">Services connectés</h2>
          <Link href="/admin/api" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
            Gérer les clés API →
          </Link>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {SERVICES.map(({ id, label, icon: Icon, description, href }) => {
            const isConnected = configuredServices.has(id)
            return (
              <Card key={id} className={cn(!isConnected && 'opacity-60')}>
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted shrink-0">
                        <Icon className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="font-semibold text-sm">{label}</p>
                        <p className="text-xs text-muted-foreground">{description}</p>
                      </div>
                    </div>
                    {isConnected ? (
                      <a href={href} target="_blank" rel="noreferrer"
                        className="text-muted-foreground hover:text-foreground transition-colors mt-0.5">
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    ) : (
                      <Badge variant="outline" className="text-xs shrink-0">Non configuré</Badge>
                    )}
                  </div>
                  {isConnected
                    ? <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-3 font-medium">● Connecté</p>
                    : <Link href="/admin/api" className="text-xs text-muted-foreground hover:text-foreground transition-colors mt-3 block underline underline-offset-2">Configurer →</Link>
                  }
                </CardContent>
              </Card>
            )
          })}
        </div>
      </section>
    </div>
  )
}

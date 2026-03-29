import Link from 'next/link'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Plus, ExternalLink, Triangle, Database, GitBranch, Clock } from 'lucide-react'
import { listZohoProjects } from '@/lib/zoho-data'
import { formatDistanceToNow } from 'date-fns'
import { fr } from 'date-fns/locale'
import { db } from '@/db'
import { apiCredentials, teams } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { cn } from '@/lib/utils'

export const metadata = { title: 'Vue d\'ensemble — NeoBridge' }

const STATUS_VARIANT: Record<string, 'default' | 'secondary' | 'outline'> = {
  active:    'default',
  completed: 'secondary',
  archived:  'outline',
}
const STATUS_LABEL: Record<string, string> = {
  active:    'Actif',
  completed: 'Terminé',
  archived:  'Archivé',
}

async function fetchConfiguredServices(teamSlug: string) {
  try {
    const rows = await db
      .select({ type: apiCredentials.type })
      .from(apiCredentials)
      .innerJoin(teams, eq(apiCredentials.teamId, teams.id))
      .where(eq(teams.slug, teamSlug))
    return new Set(rows.map(r => r.type))
  } catch {
    return new Set<string>()
  }
}

const SERVICES = [
  {
    id: 'vercel',
    label: 'Vercel',
    icon: Triangle,
    description: 'Déploiements & Edge Network',
    docsHref: 'https://vercel.com/dashboard',
  },
  {
    id: 'neon',
    label: 'Neon',
    icon: Database,
    description: 'PostgreSQL serverless',
    docsHref: 'https://console.neon.tech',
  },
  {
    id: 'github',
    label: 'GitHub',
    icon: GitBranch,
    description: 'Dépôts & CI/CD',
    docsHref: 'https://github.com',
  },
]

export default async function TeamPage({
  params,
}: {
  params: Promise<{ teamId: string }>
}) {
  const { teamId } = await params
  const [allProjects, configuredServices] = await Promise.all([
    listZohoProjects(),
    fetchConfiguredServices(teamId),
  ])

  // Sort by last modified, keep only 5 most recent
  const recentProjects = [...allProjects]
    .sort((a, b) => {
      const ta = a.last_modified_time ? new Date(a.last_modified_time).getTime() : 0
      const tb = b.last_modified_time ? new Date(b.last_modified_time).getTime() : 0
      return tb - ta
    })
    .slice(0, 5)

  return (
    <div className="space-y-8">
      {/* ── Header ─────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Vue d&apos;ensemble</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {allProjects.length} projet{allProjects.length !== 1 ? 's' : ''} · workspace <span className="font-mono">{teamId}</span>
          </p>
        </div>
        <Button asChild>
          <Link href={`/dashboard/${teamId}/new`}>
            <Plus className="h-4 w-4 mr-2" />
            Nouveau projet
          </Link>
        </Button>
      </div>

      {/* ── Projets récents ──────────────────────────────────────── */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            Projets récents
          </h2>
          {allProjects.length > 5 && (
            <Link href={`/dashboard/${teamId}/projects`}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors">
              Voir tout ({allProjects.length}) →
            </Link>
          )}
        </div>

        {recentProjects.length === 0 ? (
          <div className="flex flex-col items-center justify-center border border-dashed rounded-lg py-16 text-center">
            <p className="text-muted-foreground font-medium">Aucun projet disponible</p>
            <Button asChild className="mt-4">
              <Link href={`/dashboard/${teamId}/new`}>
                <Plus className="h-4 w-4 mr-2" />Créer un projet
              </Link>
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {recentProjects.map((project) => (
              <Link key={project.id} href={`/dashboard/${teamId}/${project.id}/infrastructure`}>
                <Card className="hover:border-primary/50 transition-colors cursor-pointer h-full">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-base truncate">{project.name}</h3>
                        {project.description && (
                          <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">{project.description}</p>
                        )}
                      </div>
                      <Badge variant={STATUS_VARIANT[project.status] ?? 'secondary'} className="shrink-0">
                        {STATUS_LABEL[project.status] ?? project.status}
                      </Badge>
                    </div>
                  </CardHeader>
                  {project.last_modified_time && (
                    <CardContent>
                      <p className="text-xs text-muted-foreground">
                        Modifié{' '}
                        {formatDistanceToNow(new Date(project.last_modified_time), { addSuffix: true, locale: fr })}
                      </p>
                    </CardContent>
                  )}
                </Card>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* ── Services & Coûts ─────────────────────────────────────── */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold">Services connectés</h2>
          <Link href="/admin/api"
            className="text-xs text-muted-foreground hover:text-foreground transition-colors">
            Gérer les clés API →
          </Link>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {SERVICES.map(({ id, label, icon: Icon, description, docsHref }) => {
            const isConnected = configuredServices.has(id)
            return (
              <Card key={id} className={cn(!isConnected && "opacity-60")}>
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
                      <a href={docsHref} target="_blank" rel="noreferrer"
                        className="text-muted-foreground hover:text-foreground transition-colors mt-0.5">
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    ) : (
                      <Badge variant="outline" className="text-xs shrink-0">Non configuré</Badge>
                    )}
                  </div>
                  {isConnected && (
                    <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-3 font-medium">● Connecté</p>
                  )}
                  {!isConnected && (
                    <Link href="/admin/api"
                      className="text-xs text-muted-foreground hover:text-foreground transition-colors mt-3 block underline underline-offset-2">
                      Configurer →
                    </Link>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      </section>
    </div>
  )
}


import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Plus, Server } from 'lucide-react'
import { getRailwayProject, getRailwayScopeInfo } from '@/lib/railway/client'

export const metadata = { title: 'Infrastructure — NeoBridge' }

interface ProjectApp {
  id: string
  name: string
  platform: 'vercel' | 'railway' | 'scaleway' | string
  credentialSource: 'Admin' | 'Team' | string
  status: 'active' | 'inactive' | 'error'
}

const PLATFORM_VARIANT: Record<string, 'default' | 'secondary' | 'outline'> = {
  vercel:   'default',
  railway:  'secondary',
  scaleway: 'outline',
}

const STATUS_VARIANT: Record<string, 'default' | 'secondary' | 'outline'> = {
  active:   'default',
  inactive: 'outline',
  error:    'secondary',
}

const STATUS_LABEL: Record<string, string> = {
  active:   'Actif',
  inactive: 'Inactif',
  error:    'Erreur',
}

async function fetchProjectApps(projectId: string): Promise<ProjectApp[]> {
  try {
    const { db } = await import('@/db')
    const { projectApps } = await import('@/db/schema')
    const { desc, eq } = await import('drizzle-orm')

    const rows = await db
      .select()
      .from(projectApps)
      .where(eq(projectApps.projectId, projectId))
      .orderBy(desc(projectApps.createdAt))

    return rows.map((app) => ({
      ...app,
      credentialSource: app.credentialSource === 'team' ? 'Team' : 'Admin',
      status: app.status ?? 'active',
    }))
  } catch {
    return []
  }
}

async function fetchRailwaySnapshot() {
  try {
    const scope = await getRailwayScopeInfo('production')
    if (!scope.projectId) return null

    const project = await getRailwayProject(scope.projectId, 'production')
    return {
      ...project,
      scope,
    }
  } catch {
    return null
  }
}

export default async function InfrastructurePage({
  params,
}: {
  params: Promise<{ teamId: string; projectId: string }>
}) {
  const { teamId, projectId } = await params
  const apps = await fetchProjectApps(projectId)
  const railway = await fetchRailwaySnapshot()
  const settingsHref = `/dashboard/${teamId}/${projectId}/settings`

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Infrastructure</h2>
          <p className="text-muted-foreground text-sm mt-0.5">
            Applications et ressources reliées à ce projet NeoBridge
          </p>
        </div>
        <Button asChild>
          <Link href={settingsHref}>
            <Plus className="h-4 w-4 mr-2" />
            Gérer les connecteurs
          </Link>
        </Button>
      </div>

      {railway ? (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-semibold text-base">Contexte Railway</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Projet et environnement détectés depuis la configuration Railway de NeoBridge.
                </p>
              </div>
              <Badge variant="secondary">{railway.scope.mode}</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div>
              <p className="font-medium">{railway.name}</p>
              <p className="text-muted-foreground break-all">Project ID: {railway.id}</p>
              {railway.scope.environmentId ? (
                <p className="text-muted-foreground break-all">Environment ID: {railway.scope.environmentId}</p>
              ) : null}
            </div>
            <div className="flex flex-wrap gap-2">
              {railway.environments.map((environment) => (
                <Badge key={environment.id} variant="outline">{environment.name}</Badge>
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              {railway.services.map((service) => (
                <Badge key={service.id} variant="secondary">{service.name}</Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : null}

      {apps.length === 0 ? (
        <div className="flex flex-col items-center justify-center border border-dashed rounded-lg py-20 text-center">
          <Server className="h-10 w-10 text-muted-foreground mb-3" />
          <p className="text-muted-foreground font-medium">Aucune application mappée</p>
          <p className="text-sm text-muted-foreground mt-1">
            Associez une application Vercel, Railway ou Scaleway à ce projet
          </p>
          <Button asChild className="mt-4">
            <Link href={settingsHref}>
              <Plus className="h-4 w-4 mr-2" />
              Ajouter un connecteur
            </Link>
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {apps.map((app) => (
            <Card key={app.id} className="h-full">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-semibold text-base truncate">{app.name}</h3>
                  <Badge
                    variant={STATUS_VARIANT[app.status] ?? 'outline'}
                    className="shrink-0"
                  >
                    {STATUS_LABEL[app.status] ?? app.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="flex items-center gap-2">
                <Badge variant={PLATFORM_VARIANT[app.platform] ?? 'outline'}>
                  {app.platform}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  via {app.credentialSource}
                </span>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

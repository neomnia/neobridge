import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Plus, Server } from 'lucide-react'

export const metadata = { title: 'Infrastructure — NeoBridge' }

interface ProjectApp {
  id: string
  name: string
  platform: 'vercel' | 'railway' | 'scaleway' | string
  credentialSource: 'Admin' | 'Team'
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
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_APP_URL ?? ''}/api/projects/${projectId}/apps`,
      { cache: 'no-store' },
    )
    if (!res.ok) return []
    const data: ProjectApp[] = await res.json()
    return Array.isArray(data) ? data : []
  } catch {
    return []
  }
}

export default async function InfrastructurePage({
  params,
}: {
  params: Promise<{ teamId: string; projectId: string }>
}) {
  const { teamId: _teamId, projectId } = await params
  const apps = await fetchProjectApps(projectId)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Infrastructure</h2>
          <p className="text-muted-foreground text-sm mt-0.5">
            Applications mappées sur ce projet — CockpitGrid
          </p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Mapper une application
        </Button>
      </div>

      {apps.length === 0 ? (
        <div className="flex flex-col items-center justify-center border border-dashed rounded-lg py-20 text-center">
          <Server className="h-10 w-10 text-muted-foreground mb-3" />
          <p className="text-muted-foreground font-medium">Aucune application mappée</p>
          <p className="text-sm text-muted-foreground mt-1">
            Associez une application Vercel, Railway ou Scaleway à ce projet
          </p>
          <Button className="mt-4">
            <Plus className="h-4 w-4 mr-2" />
            Mapper une application
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

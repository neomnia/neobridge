import Link from 'next/link'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ImpersonationBanner } from '@/components/admin/impersonation-banner'
import { listZohoProjects } from '@/lib/zoho-data'
import { formatDistanceToNow } from 'date-fns'
import { fr } from 'date-fns/locale'

export const metadata = { title: 'Mes projets — NeoBridge' }

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

export default async function DashboardPage() {
  const projects = await listZohoProjects()

  return (
    <div className="space-y-6">
      <ImpersonationBanner />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Mes projets</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {projects.length} projet{projects.length !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {projects.length === 0 ? (
        <div className="flex flex-col items-center justify-center border border-dashed rounded-lg py-20 text-center">
          <p className="text-muted-foreground font-medium">Aucun projet disponible</p>
          <p className="text-sm text-muted-foreground mt-1">
            Vérifiez la configuration Zoho ou activez le mode mock
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map(project => (
            <Link key={project.id} href={`/dashboard/${project.id}`}>
              <Card className="hover:border-primary/50 transition-colors cursor-pointer h-full">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-base truncate">{project.name}</h3>
                      {project.description && (
                        <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">
                          {project.description}
                        </p>
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
                      {formatDistanceToNow(new Date(project.last_modified_time), {
                        addSuffix: true,
                        locale: fr,
                      })}
                    </p>
                  </CardContent>
                )}
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

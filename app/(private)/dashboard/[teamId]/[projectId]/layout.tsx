import { notFound } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
import { getZohoProject } from '@/lib/zoho-data'

const STATUS_LABEL: Record<string, string> = {
  active:    'Actif',
  completed: 'Terminé',
  archived:  'Archivé',
}

const STATUS_VARIANT: Record<string, 'default' | 'secondary' | 'outline'> = {
  active:    'default',
  completed: 'secondary',
  archived:  'outline',
}

export default async function ProjectLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ teamId: string; projectId: string }>
}) {
  const { projectId } = await params
  const project = await getZohoProject(projectId)
  if (!project) notFound()

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 pb-4 border-b">
        <div>
          <h1 className="text-xl font-bold">{project.name}</h1>
          {project.description && (
            <p className="text-sm text-muted-foreground mt-0.5">{project.description}</p>
          )}
        </div>
        <Badge variant={STATUS_VARIANT[project.status] ?? 'secondary'} className="shrink-0">
          {STATUS_LABEL[project.status] ?? project.status}
        </Badge>
      </div>

      {children}
    </div>
  )
}

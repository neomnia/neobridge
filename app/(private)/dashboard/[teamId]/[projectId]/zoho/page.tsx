import Link from 'next/link'
import { KanbanBoard, AddTaskButton } from '@/components/neobridge/kanban/KanbanBoard'
import { getProjectZohoBinding, listZohoTasks } from '@/lib/zoho-data'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { BarChart3, Link2 } from 'lucide-react'

export const metadata = { title: 'Zoho — NeoBridge' }

export default async function ZohoPage({
  params,
}: {
  params: Promise<{ teamId: string; projectId: string }>
}) {
  const { teamId, projectId } = await params
  const binding = await getProjectZohoBinding(projectId)
  const tasks = binding?.zohoProjectId
    ? await listZohoTasks(binding.zohoProjectId, { portalId: binding.portalId ?? undefined })
    : []

  if (!binding?.isConnected) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <BarChart3 className="h-6 w-6 text-muted-foreground" />
          <div>
            <h2 className="text-xl font-semibold">Hub Zoho</h2>
            <p className="text-muted-foreground text-sm mt-0.5">
              Connectez Zoho Projects à ce projet NeoBridge pour activer le Kanban
            </p>
          </div>
        </div>

        <Card>
          <CardContent className="py-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-medium">Aucun connecteur Zoho configuré</p>
              <p className="text-sm text-muted-foreground mt-1">
                Le layout projet reste accessible, mais les données métier Zoho sont désormais chargées seulement ici.
              </p>
            </div>
            <Button asChild variant="outline" className="gap-2">
              <Link href={`/dashboard/${teamId}/${projectId}/settings`}>
                <Link2 className="h-4 w-4" />
                Configurer Zoho
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <BarChart3 className="h-6 w-6 text-muted-foreground" />
          <div>
            <h2 className="text-xl font-semibold">Hub Zoho</h2>
            <p className="text-muted-foreground text-sm mt-0.5">
              {tasks.length} tâche{tasks.length !== 1 ? 's' : ''} — {binding.label}
            </p>
          </div>
        </div>
        <AddTaskButton
          projectId={binding.zohoProjectId ?? projectId}
          portalId={binding.portalId}
          disabled={!binding.isConnected}
        />
      </div>
      <div className="flex-1 overflow-hidden">
        <KanbanBoard initialTasks={tasks} projectId={projectId} />
      </div>
    </div>
  )
}

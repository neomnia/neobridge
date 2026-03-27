import { KanbanBoard, AddTaskButton } from '@/components/neobridge/kanban/KanbanBoard'
import { listZohoTasks } from '@/lib/zoho-data'
import { BarChart3 } from 'lucide-react'

export const metadata = { title: 'Zoho — NeoBridge' }

export default async function ZohoPage({
  params,
}: {
  params: Promise<{ teamId: string; projectId: string }>
}) {
  const { projectId } = await params
  const tasks = await listZohoTasks(projectId)

  return (
    <div className="flex flex-col h-full space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <BarChart3 className="h-6 w-6 text-muted-foreground" />
          <div>
            <h2 className="text-xl font-semibold">Hub Zoho</h2>
            <p className="text-muted-foreground text-sm mt-0.5">
              {tasks.length} tâche{tasks.length !== 1 ? 's' : ''} — Kanban Zoho Projects
            </p>
          </div>
        </div>
        <AddTaskButton projectId={projectId} />
      </div>
      <div className="flex-1 overflow-hidden">
        <KanbanBoard initialTasks={tasks} projectId={projectId} />
      </div>
    </div>
  )
}

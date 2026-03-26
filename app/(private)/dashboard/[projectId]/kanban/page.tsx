import { KanbanBoard, AddTaskButton } from '@/components/neobridge/kanban/KanbanBoard'
import { listZohoTasks } from '@/lib/zoho-data'

export default async function KanbanPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params
  const tasks = await listZohoTasks(projectId)

  return (
    <div className="flex flex-col h-full space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Kanban</h2>
          <p className="text-muted-foreground text-sm mt-0.5">
            {tasks.length} tâche{tasks.length > 1 ? 's' : ''}
          </p>
        </div>
        <AddTaskButton projectId={projectId} />
      </div>
      <div className="flex-1 overflow-hidden">
        <KanbanBoard initialTasks={tasks} projectId={projectId} />
      </div>
    </div>
  )
}

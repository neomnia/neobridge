import { KanbanBoard } from "@/components/neobridge/kanban/KanbanBoard"
import { listZohoTasks } from "@/lib/zoho-data"

export const metadata = { title: "Kanban — NeoBridge" }

const DEFAULT_PROJECT = process.env.ZOHO_DEFAULT_PROJECT_ID ?? "p1"

export default async function KanbanPage() {
  const tasks = await listZohoTasks(DEFAULT_PROJECT)

  return (
    <div className="flex flex-col h-full space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Kanban</h1>
        <p className="text-muted-foreground text-sm mt-1">{tasks.length} tâche{tasks.length > 1 ? "s" : ""} au total</p>
      </div>
      <div className="flex-1 overflow-hidden">
        <KanbanBoard initialTasks={tasks} zohoProjectId={DEFAULT_PROJECT} />
      </div>
    </div>
  )
}

import { KanbanBoard, AddTaskButton } from "@/components/neobridge/kanban/KanbanBoard"
import { type ZohoTask } from "@/lib/zoho"

export const metadata = { title: "Kanban — NeoBridge" }

const DEFAULT_PROJECT = process.env.ZOHO_DEFAULT_PROJECT_ID ?? "p1"

async function fetchTasks(): Promise<ZohoTask[]> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"
    const res = await fetch(`${baseUrl}/api/zoho?action=listTasks&projectId=${DEFAULT_PROJECT}`, {
      cache: "no-store",
    })
    if (!res.ok) return []
    return res.json()
  } catch {
    return []
  }
}

export default async function KanbanPage() {
  const tasks = await fetchTasks()

  return (
    <div className="flex flex-col h-full space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Kanban</h1>
          <p className="text-muted-foreground text-sm mt-1">{tasks.length} tâche{tasks.length > 1 ? "s" : ""} au total</p>
        </div>
        <AddTaskButton projectId={DEFAULT_PROJECT} />
      </div>

      <div className="flex-1 overflow-hidden">
        <KanbanBoard initialTasks={tasks} projectId={DEFAULT_PROJECT} />
      </div>
    </div>
  )
}

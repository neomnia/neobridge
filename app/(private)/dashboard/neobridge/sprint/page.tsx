import { SprintPlanner } from "@/components/neobridge/sprint/SprintPlanner"
import { type ZohoTask } from "@/lib/zoho"

export const metadata = { title: "Sprint Planner — NeoBridge" }

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

export default async function SprintPage() {
  const tasks = await fetchTasks()

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Sprint Planner</h1>
        <p className="text-muted-foreground text-sm mt-1">Planifier et lancer des sprints automatisés</p>
      </div>
      <SprintPlanner initialTasks={tasks} projectId={DEFAULT_PROJECT} />
    </div>
  )
}

import { SprintPlanner } from '@/components/neobridge/sprint/SprintPlanner'
import { type ZohoTask } from '@/lib/zoho'

async function fetchTasks(projectId: string): Promise<ZohoTask[]> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
    const res = await fetch(`${baseUrl}/api/zoho?action=listTasks&projectId=${projectId}`, { cache: 'no-store' })
    if (!res.ok) return []
    return res.json()
  } catch {
    return []
  }
}

export default async function SprintPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params
  const tasks = await fetchTasks(projectId)

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold">Sprint Planner</h2>
        <p className="text-muted-foreground text-sm mt-0.5">Planifier et lancer des sprints automatisés</p>
      </div>
      <SprintPlanner initialTasks={tasks} projectId={projectId} />
    </div>
  )
}

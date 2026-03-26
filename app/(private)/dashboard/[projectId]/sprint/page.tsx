import { SprintPlanner } from '@/components/neobridge/sprint/SprintPlanner'
import { listZohoTasks } from '@/lib/zoho-data'

export default async function SprintPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params
  const tasks = await listZohoTasks(projectId)

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

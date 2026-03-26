import { StatsGrid } from '@/components/neobridge/dashboard/StatsGrid'
import { MilestoneProgress } from '@/components/neobridge/dashboard/MilestoneProgress'
import { AgentStatus } from '@/components/neobridge/dashboard/AgentStatus'
import { RecentActivity } from '@/components/neobridge/dashboard/RecentActivity'
import { type ZohoTask, type ZohoMilestone } from '@/lib/zoho'

async function fetchTasks(projectId: string): Promise<ZohoTask[]> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
    const res = await fetch(`${baseUrl}/api/zoho?action=listTasks&projectId=${projectId}`, {
      next: { revalidate: 60 },
    })
    if (!res.ok) return []
    return res.json()
  } catch {
    return []
  }
}

async function fetchMilestones(projectId: string): Promise<ZohoMilestone[]> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
    const res = await fetch(`${baseUrl}/api/zoho?action=listMilestones&projectId=${projectId}`, {
      next: { revalidate: 60 },
    })
    if (!res.ok) return []
    return res.json()
  } catch {
    return []
  }
}

export default async function ProjectPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params
  const [tasks, milestones] = await Promise.all([fetchTasks(projectId), fetchMilestones(projectId)])

  return (
    <div className="space-y-6">
      <StatsGrid tasks={tasks} milestones={milestones} lastWorkflowStatus={null} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <RecentActivity />
        </div>
        <div>
          <AgentStatus lastWorkflowId={null} />
        </div>
      </div>

      <MilestoneProgress milestones={milestones} />
    </div>
  )
}

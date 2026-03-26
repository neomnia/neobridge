import { StatsGrid } from '@/components/neobridge/dashboard/StatsGrid'
import { MilestoneProgress } from '@/components/neobridge/dashboard/MilestoneProgress'
import { AgentStatus } from '@/components/neobridge/dashboard/AgentStatus'
import { RecentActivity } from '@/components/neobridge/dashboard/RecentActivity'
import { listZohoTasks, listZohoMilestones } from '@/lib/zoho-data'

export default async function ProjectPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params
  const [tasks, milestones] = await Promise.all([
    listZohoTasks(projectId),
    listZohoMilestones(projectId),
  ])

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

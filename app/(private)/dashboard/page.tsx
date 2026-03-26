import { ImpersonationBanner } from "@/components/admin/impersonation-banner"
import { StatsGrid } from "@/components/neobridge/dashboard/StatsGrid"
import { MilestoneProgress } from "@/components/neobridge/dashboard/MilestoneProgress"
import { AgentStatus } from "@/components/neobridge/dashboard/AgentStatus"
import { RecentActivity } from "@/components/neobridge/dashboard/RecentActivity"
import { type ZohoTask, type ZohoMilestone } from "@/lib/zoho"

export const metadata = { title: "Dashboard — NeoBridge" }

async function fetchTasks(): Promise<ZohoTask[]> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"
    const res = await fetch(`${baseUrl}/api/zoho?action=listTasks`, {
      next: { revalidate: 60 },
    })
    if (!res.ok) return []
    return res.json()
  } catch {
    return []
  }
}

async function fetchMilestones(): Promise<ZohoMilestone[]> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"
    const res = await fetch(`${baseUrl}/api/zoho?action=listMilestones`, {
      next: { revalidate: 60 },
    })
    if (!res.ok) return []
    return res.json()
  } catch {
    return []
  }
}

export default async function DashboardPage() {
  const [tasks, milestones] = await Promise.all([fetchTasks(), fetchMilestones()])

  return (
    <div className="space-y-6">
      <ImpersonationBanner />

      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground text-sm mt-1">Vue d&apos;ensemble du projet en temps réel</p>
      </div>

      <StatsGrid tasks={tasks} milestones={milestones} lastWorkflowStatus={null} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <RecentActivity />
        </div>
        <div className="space-y-4">
          <AgentStatus lastWorkflowId={null} />
        </div>
      </div>

      <MilestoneProgress milestones={milestones} />
    </div>
  )
}

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { CheckCircle2, Loader2, ListTodo, Flag } from "lucide-react"
import { type ZohoTask, type ZohoMilestone } from "@/lib/zoho"

interface StatsGridProps {
  tasks: ZohoTask[]
  milestones: ZohoMilestone[]
  lastWorkflowStatus: string | null
}

export function StatsGrid({ tasks, milestones, lastWorkflowStatus }: StatsGridProps) {
  const open       = tasks.filter((t) => t.status.name === "Open").length
  const inProgress = tasks.filter((t) => t.status.name === "In Progress").length
  const closed     = tasks.filter((t) => t.status.name === "Closed").length
  const activeMilestones = milestones.filter((m) => m.status === "InProgress").length

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Tâches ouvertes</CardTitle>
          <ListTodo className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{open}</div>
          <p className="text-xs text-muted-foreground mt-1">{inProgress} en cours</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Tâches terminées</CardTitle>
          <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{closed}</div>
          <p className="text-xs text-muted-foreground mt-1">sur {tasks.length} au total</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Session agent</CardTitle>
          <Loader2 className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{lastWorkflowStatus ?? "—"}</div>
          <p className="text-xs text-muted-foreground mt-1">dernière session</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Jalons actifs</CardTitle>
          <Flag className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{activeMilestones}</div>
          <p className="text-xs text-muted-foreground mt-1">sur {milestones.length} jalons</p>
        </CardContent>
      </Card>
    </div>
  )
}

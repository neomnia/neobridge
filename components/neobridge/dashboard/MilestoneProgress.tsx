import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { type ZohoMilestone } from "@/lib/zoho"

interface MilestoneProgressProps {
  milestones: ZohoMilestone[]
}

function statusVariant(status: string): "default" | "secondary" | "outline" {
  if (status === "InProgress") return "default"
  if (status === "Completed")  return "secondary"
  return "outline"
}

export function MilestoneProgress({ milestones }: MilestoneProgressProps) {
  if (milestones.length === 0) return null

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium">Jalons</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {milestones.map((m) => {
          const completed = m.completed_task_count ?? 0
          const total = m.task_count ?? 0
          const pct = total > 0 ? Math.round((completed / total) * 100) : 0

          return (
            <div key={m.id} className="space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium truncate">{m.name}</span>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs text-muted-foreground">{pct}%</span>
                  <Badge variant={statusVariant(m.status)} className="text-xs">{m.status}</Badge>
                </div>
              </div>
              <Progress value={pct} className="h-1.5" />
              {m.end_date && (
                <p className="text-xs text-muted-foreground">Échéance : {m.end_date}</p>
              )}
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}

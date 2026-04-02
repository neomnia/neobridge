"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Checkbox } from "@/components/ui/checkbox"
import { ScrollArea } from "@/components/ui/scroll-area"
import { WorkflowStatus } from "@/components/neobridge/WorkflowStatus"
import { useWorkflowStatus } from "@/hooks/use-workflow-status"
import { Rocket, ListChecks } from "lucide-react"
import { type ZohoTask } from "@/lib/zoho"

const PRIORITY_ORDER: Record<string, number> = { High: 0, Medium: 1, Low: 2 }
const PRIORITY_VARIANT: Record<string, "destructive" | "default" | "secondary"> = {
  High: "destructive", Medium: "default", Low: "secondary",
}

interface SprintPlannerProps {
  initialTasks: ZohoTask[]
  projectId: string
}

export function SprintPlanner({ initialTasks, projectId }: SprintPlannerProps) {
  const backlog = [...initialTasks]
    .filter((t) => t.status.name !== "Closed")
    .sort((a, b) => (PRIORITY_ORDER[a.priority] ?? 3) - (PRIORITY_ORDER[b.priority] ?? 3))

  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [activeWorkflow, setActiveWorkflow] = useState<string | null>(null)
  const [launching, setLaunching] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const workflowState = useWorkflowStatus(activeWorkflow)

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })

  const launchSprint = async () => {
    if (selected.size === 0) return
    setLaunching(true)
    setError(null)
    try {
      const res = await fetch("/api/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workflow: "sprintPlanningWorkflow",
          taskIds: [...selected],
          projectId,
          mode: "sprint",
        }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? `HTTP ${res.status}`)
      }
      const data = await res.json()
      setActiveWorkflow(data.workflowId)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLaunching(false)
    }
  }

  const pct = workflowState.totalSteps > 0
    ? Math.round((workflowState.completedSteps / workflowState.totalSteps) * 100)
    : 0

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Backlog */}
      <div className="lg:col-span-2 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium flex items-center gap-2">
            <ListChecks className="h-4 w-4" />
            Backlog ({backlog.length} tâches)
          </h2>
          <Button variant="ghost" size="sm" onClick={() => setSelected(new Set(backlog.map((t) => t.id)))}>
            Tout sélectionner
          </Button>
        </div>

        <ScrollArea className="h-[60vh]">
          <div className="space-y-2 pr-2">
            {backlog.map((task) => (
              <Card
                key={task.id}
                className={`cursor-pointer transition-colors ${selected.has(task.id) ? "ring-1 ring-primary" : ""}`}
                onClick={() => toggle(task.id)}
              >
                <CardContent className="p-3 flex items-start gap-3">
                  <Checkbox
                    checked={selected.has(task.id)}
                    onCheckedChange={() => toggle(task.id)}
                    onClick={(e) => e.stopPropagation()}
                    className="mt-0.5"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{task.name}</p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      <Badge variant={PRIORITY_VARIANT[task.priority] ?? "outline"} className="text-xs">{task.priority}</Badge>
                      <Badge variant="secondary" className="text-xs">{task.status.name}</Badge>
                      {task.tags?.map((t) => <Badge key={t.name} variant="outline" className="text-xs">{t.name}</Badge>)}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            {backlog.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-8">Aucune tâche dans le backlog</p>
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Sprint summary + launch */}
      <div className="space-y-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Sprint sélectionné</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center">
              <span className="text-3xl font-bold">{selected.size}</span>
              <p className="text-xs text-muted-foreground">tâche{selected.size > 1 ? "s" : ""} sélectionnée{selected.size > 1 ? "s" : ""}</p>
            </div>

            {selected.size > 0 && (
              <ScrollArea className="h-32">
                <ul className="space-y-1 text-xs text-muted-foreground">
                  {[...selected].map((id) => {
                    const task = backlog.find((t) => t.id === id)
                    return task ? <li key={id} className="truncate">• {task.name}</li> : null
                  })}
                </ul>
              </ScrollArea>
            )}

            {error && <p className="text-xs text-destructive">{error}</p>}

            <Button
              className="w-full gap-2"
              onClick={launchSprint}
              disabled={selected.size === 0 || launching || workflowState.status === "RUNNING"}
            >
              <Rocket className="h-4 w-4" />
              {launching ? "Démarrage…" : "Lancer le sprint"}
            </Button>
          </CardContent>
        </Card>

        {/* Sprint progress */}
        {activeWorkflow && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Sprint en cours</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <WorkflowStatus state={workflowState} />
              {workflowState.totalSteps > 0 && (
                <div className="space-y-1">
                  <Progress value={pct} />
                  <p className="text-xs text-muted-foreground text-center">
                    {workflowState.completedSteps}/{workflowState.totalSteps} tâches
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}

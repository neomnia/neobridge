"use client"

import { useState, useCallback } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Bot, Plus, GripVertical } from "lucide-react"
import { cn } from "@/lib/utils"
import { type ZohoTask } from "@/lib/zoho"

type KanbanStatus = "Open" | "In Progress" | "In Review" | "Closed"

const COLUMNS: { id: KanbanStatus; label: string }[] = [
  { id: "Open",        label: "Open" },
  { id: "In Progress", label: "In Progress" },
  { id: "In Review",   label: "In Review" },
  { id: "Closed",      label: "Closed" },
]

const PRIORITY_VARIANT: Record<string, "destructive" | "default" | "secondary" | "outline"> = {
  High:   "destructive",
  Medium: "default",
  Low:    "secondary",
}

interface KanbanBoardProps {
  initialTasks: ZohoTask[]
  projectId: string
}

export function KanbanBoard({ initialTasks, projectId }: KanbanBoardProps) {
  const [tasks, setTasks] = useState<ZohoTask[]>(initialTasks)
  const [selected, setSelected] = useState<ZohoTask | null>(null)
  const [dragging, setDragging] = useState<string | null>(null)
  const [agentLoading, setAgentLoading] = useState<string | null>(null)

  const tasksByStatus = useCallback(
    (status: KanbanStatus) => tasks.filter((t) => t.status.name === status),
    [tasks]
  )

  const handleDragStart = (taskId: string) => setDragging(taskId)
  const handleDragEnd = () => setDragging(null)

  const handleDrop = async (status: KanbanStatus) => {
    if (!dragging) return
    const task = tasks.find((t) => t.id === dragging)
    if (!task || task.status.name === status) return

    setTasks((prev) =>
      prev.map((t) => (t.id === dragging ? { ...t, status: { name: status, id: status.toLowerCase().replace(" ", "") } } : t))
    )
    setDragging(null)

    // Persist to Zoho
    await fetch(`/api/zoho?action=updateTask&projectId=${projectId}&taskId=${dragging}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    })
  }

  const assignToAgent = async (task: ZohoTask) => {
    setAgentLoading(task.id)
    try {
      await fetch("/api/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workflow: "agentSessionWorkflow", taskId: task.id, projectId, mode: "single" }),
      })
    } finally {
      setAgentLoading(null)
    }
  }

  return (
    <>
      <div className="flex gap-4 overflow-x-auto pb-4 h-full">
        {COLUMNS.map(({ id, label }) => (
          <div
            key={id}
            className="flex-shrink-0 w-72"
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => handleDrop(id)}
          >
            <div className="flex items-center gap-2 mb-3">
              <h3 className="font-medium text-sm">{label}</h3>
              <Badge variant="secondary" className="text-xs">{tasksByStatus(id).length}</Badge>
            </div>

            <div className={cn("min-h-24 space-y-2 rounded-lg p-1 transition-colors", dragging && "ring-1 ring-border")}>
              {tasksByStatus(id).map((task) => (
                <Card
                  key={task.id}
                  className="cursor-grab active:cursor-grabbing select-none hover:shadow-md transition-shadow"
                  draggable
                  onDragStart={() => handleDragStart(task.id)}
                  onDragEnd={handleDragEnd}
                  onClick={() => setSelected(task)}
                >
                  <CardContent className="p-3 space-y-2">
                    <div className="flex items-start justify-between gap-1">
                      <p className="text-sm font-medium leading-snug">{task.name}</p>
                      <GripVertical className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                    </div>
                    <div className="flex flex-wrap gap-1">
                      <Badge variant={PRIORITY_VARIANT[task.priority] ?? "outline"} className="text-xs">
                        {task.priority}
                      </Badge>
                      {task.tags?.map((t) => (
                        <Badge key={t.name} variant="secondary" className="text-xs">{t.name}</Badge>
                      ))}
                    </div>
                    <div className="flex items-center justify-between">
                      {task.owner?.[0] && (
                        <span className="text-xs text-muted-foreground">{task.owner[0].name}</span>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 px-1.5 text-xs gap-1 ml-auto"
                        disabled={agentLoading === task.id}
                        onClick={(e) => { e.stopPropagation(); assignToAgent(task) }}
                      >
                        <Bot className="h-3 w-3" />
                        {agentLoading === task.id ? "…" : "Agent"}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}

              {tasksByStatus(id).length === 0 && (
                <div className="flex items-center justify-center h-16 border-2 border-dashed rounded-lg text-xs text-muted-foreground">
                  Déposer ici
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Task Detail Dialog */}
      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base">{selected?.name}</DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2">
                <Badge variant={PRIORITY_VARIANT[selected.priority] ?? "outline"}>{selected.priority}</Badge>
                <Badge variant="secondary">{selected.status.name}</Badge>
                {selected.tags?.map((t) => <Badge key={t.name} variant="outline">{t.name}</Badge>)}
              </div>
              {selected.owner && selected.owner.length > 0 && (
                <p className="text-sm text-muted-foreground">Assigné à : {selected.owner.map((o) => o.name).join(", ")}</p>
              )}
              {selected.description && (
                <ScrollArea className="h-32">
                  <p className="text-sm">{selected.description}</p>
                </ScrollArea>
              )}
              <Button
                className="w-full gap-2"
                onClick={() => { assignToAgent(selected); setSelected(null) }}
                disabled={agentLoading === selected.id}
              >
                <Bot className="h-4 w-4" />
                Assigner à l&apos;agent
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}

export function AddTaskButton({
  projectId: _projectId,
  portalId,
  disabled = false,
}: {
  projectId: string
  portalId?: string | null
  disabled?: boolean
}) {
  if (disabled || !portalId) {
    return (
      <Button size="sm" variant="outline" className="gap-1.5" disabled>
        <Plus className="h-4 w-4" />
        Nouvelle tâche
      </Button>
    )
  }

  return (
    <Button size="sm" variant="outline" className="gap-1.5" asChild>
      <a href={`https://projects.zoho.eu/portal/${portalId}/`} target="_blank" rel="noopener noreferrer">
        <Plus className="h-4 w-4" />
        Nouvelle tâche
      </a>
    </Button>
  )
}

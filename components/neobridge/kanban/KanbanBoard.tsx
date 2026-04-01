"use client"

import React, { useState, useCallback, type ChangeEvent, type KeyboardEvent } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { Bot, Plus, GripVertical, X, ExternalLink } from "lucide-react"
import { cn } from "@/lib/utils"
import { type ZohoTask } from "@/lib/zoho"

type KanbanStatus = "Open" | "In Progress" | "In Review" | "Closed"

const COLUMNS: { id: KanbanStatus; label: string; color: string }[] = [
  { id: "Open",        label: "Open",        color: "border-t-slate-400"  },
  { id: "In Progress", label: "In Progress", color: "border-t-blue-500"   },
  { id: "In Review",   label: "In Review",   color: "border-t-amber-500"  },
  { id: "Closed",      label: "Closed",      color: "border-t-green-500"  },
]

const PRIORITY_VARIANT: Record<string, "destructive" | "default" | "secondary" | "outline"> = {
  High:   "destructive",
  Medium: "default",
  Low:    "secondary",
}

interface KanbanBoardProps {
  initialTasks: ZohoTask[]
  /** Zoho project ID (numeric) — used in API calls */
  zohoProjectId: string
  portalBaseUrl?: string
}

// ── Inline new-task row ───────────────────────────────────────────────────────

function NewTaskRow({
  zohoProjectId,
  onCreated,
  onCancel,
}: {
  zohoProjectId: string
  onCreated: (task: ZohoTask) => void
  onCancel: () => void
}) {
  const [name, setName] = useState("")
  const [priority, setPriority] = useState("Medium")
  const [loading, setLoading] = useState(false)

  const submit = async () => {
    if (!name.trim()) return
    setLoading(true)
    try {
      const res = await fetch(`/api/zoho?action=createTask&projectId=${zohoProjectId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), priority }),
      })
      const data = await res.json()
      // Zoho returns { tasks: [...] } on create
      const created: ZohoTask = data.tasks?.[0] ?? {
        id: `tmp-${Date.now()}`,
        name: name.trim(),
        status: { name: "Open", id: "open" },
        priority,
        owner: [],
        tags: [],
      }
      onCreated(created)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="rounded-lg border bg-card p-2 space-y-2">
      <Input
        autoFocus
        placeholder="Nom de la tâche…"
        value={name}
        onChange={(e: ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
        onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => { if (e.key === "Enter") submit(); if (e.key === "Escape") onCancel() }}
        className="h-7 text-sm"
      />
      <div className="flex items-center gap-2">
        <Select value={priority} onValueChange={setPriority}>
          <SelectTrigger className="h-7 text-xs flex-1">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="High">Haute</SelectItem>
            <SelectItem value="Medium">Moyenne</SelectItem>
            <SelectItem value="Low">Basse</SelectItem>
          </SelectContent>
        </Select>
        <Button size="sm" className="h-7 px-2 text-xs" disabled={loading || !name.trim()} onClick={submit}>
          {loading ? "…" : "Créer"}
        </Button>
        <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={onCancel}>
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  )
}

// ── Main board ────────────────────────────────────────────────────────────────

export function KanbanBoard({ initialTasks, zohoProjectId, portalBaseUrl }: KanbanBoardProps) {
  const [tasks, setTasks] = useState<ZohoTask[]>(initialTasks)
  const [selected, setSelected] = useState<ZohoTask | null>(null)
  const [dragging, setDragging] = useState<string | null>(null)
  const [agentLoading, setAgentLoading] = useState<string | null>(null)
  const [addingInColumn, setAddingInColumn] = useState<KanbanStatus | null>(null)

  const tasksByStatus = useCallback(
    (status: KanbanStatus) => tasks.filter((t: ZohoTask) => t.status.name === status),
    [tasks]
  )

  const handleDragStart = (taskId: string) => setDragging(taskId)
  const handleDragEnd = () => setDragging(null)

  const handleDrop = async (status: KanbanStatus) => {
    if (!dragging) return
    const task = tasks.find((t: ZohoTask) => t.id === dragging)
    if (!task || task.status.name === status) return

    setTasks((prev: ZohoTask[]) =>
      prev.map((t: ZohoTask) => t.id === dragging ? { ...t, status: { name: status, id: status.toLowerCase().replace(/ /g, "") } } : t)
    )
    setDragging(null)

    await fetch(`/api/zoho?action=updateTask&projectId=${zohoProjectId}&taskId=${dragging}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    })
  }

  const assignToAgent = async (task: ZohoTask) => {
    setAgentLoading(task.id)
    try {
      await fetch("/api/temporal/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workflow: "agentSessionWorkflow", taskId: task.id, projectId: zohoProjectId, mode: "single" }),
      })
    } finally {
      setAgentLoading(null)
    }
  }

  const handleTaskCreated = (task: ZohoTask) => {
    setTasks((prev: ZohoTask[]) => [task, ...prev])
    setAddingInColumn(null)
  }

  return (
    <>
      <div className="flex gap-4 overflow-x-auto pb-4 h-full">
        {COLUMNS.map(({ id, label, color }) => (
          <div
            key={id}
            className="flex-shrink-0 w-72 flex flex-col"
            onDragOver={(e: React.DragEvent) => e.preventDefault()}
            onDrop={() => handleDrop(id)}
          >
            {/* Column header */}
            <div className={`flex items-center gap-2 mb-3 pb-2 border-t-2 pt-2 ${color}`}>
              <h3 className="font-medium text-sm">{label}</h3>
              <Badge variant="secondary" className="text-xs">{tasksByStatus(id).length}</Badge>
              <Button
                size="sm"
                variant="ghost"
                className="h-6 w-6 p-0 ml-auto opacity-60 hover:opacity-100"
                onClick={() => setAddingInColumn(id)}
              >
                <Plus className="h-3.5 w-3.5" />
              </Button>
            </div>

            {/* Cards */}
            <div className={cn("flex-1 space-y-2 rounded-lg p-1 transition-colors", dragging && "ring-1 ring-border")}>
              {/* Inline new task form */}
              {addingInColumn === id && (
                <NewTaskRow
                  zohoProjectId={zohoProjectId}
                  onCreated={handleTaskCreated}
                  onCancel={() => setAddingInColumn(null)}
                />
              )}

              {tasksByStatus(id).map((task: ZohoTask) => (
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
                      {task.tags?.map((t: { name: string }) => (
                        <Badge key={t.name} variant="secondary" className="text-xs">{t.name}</Badge>
                      ))}
                    </div>
                    <div className="flex items-center justify-between">
                      {task.owner?.[0] && (
                        <span className="text-xs text-muted-foreground truncate">{task.owner[0].name}</span>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 px-1.5 text-xs gap-1 ml-auto shrink-0"
                        disabled={agentLoading === task.id}
                        onClick={(e: React.MouseEvent) => { e.stopPropagation(); assignToAgent(task) }}
                      >
                        <Bot className="h-3 w-3" />
                        {agentLoading === task.id ? "…" : "Agent"}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}

              {tasksByStatus(id).length === 0 && addingInColumn !== id && (
                <button
                  className="flex items-center justify-center w-full h-16 border-2 border-dashed rounded-lg text-xs text-muted-foreground hover:border-brand/40 hover:text-brand/60 transition-colors"
                  onClick={() => setAddingInColumn(id)}
                >
                  + Ajouter une tâche
                </button>
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
                {selected.tags?.map((t: { name: string }) => <Badge key={t.name} variant="outline">{t.name}</Badge>)}
              </div>
              {selected.owner && selected.owner.length > 0 && (
                <p className="text-sm text-muted-foreground">
                  Assigné à : {selected.owner.map((o: { name: string }) => o.name).join(", ")}
                </p>
              )}
              {selected.description && (
                <ScrollArea className="h-32">
                  <p className="text-sm">{selected.description}</p>
                </ScrollArea>
              )}
              <div className="flex gap-2 pt-1">
                <Button
                  className="flex-1 gap-2"
                  onClick={() => { assignToAgent(selected); setSelected(null) }}
                  disabled={agentLoading === selected.id}
                >
                  <Bot className="h-4 w-4" />
                  Assigner à l&apos;agent
                </Button>
                {portalBaseUrl && (
                  <Button variant="outline" size="icon" asChild>
                    <a
                      href={`${portalBaseUrl}/tasks/`}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="Ouvrir dans Zoho"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}

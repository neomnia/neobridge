"use client"

import React, {
  useState, useCallback, useTransition,
  type ChangeEvent, type KeyboardEvent,
} from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
  Bot, Plus, GripVertical, X, ExternalLink, RefreshCw,
  Calendar, Percent, User, Tag, AlertCircle,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { type ZohoTask, type ZohoStatus, zohoUiUrl } from "@/lib/zoho"
import type { ZohoMilestone } from "@/lib/zoho"

// ── Helpers ───────────────────────────────────────────────────────────────────

const PRIORITY_VARIANT: Record<string, "destructive" | "default" | "secondary" | "outline"> = {
  High:   "destructive",
  Medium: "default",
  Low:    "secondary",
  None:   "outline",
}

const PRIORITY_OPTIONS = ["High", "Medium", "Low", "None"]

function isOverdue(due_date?: string): boolean {
  if (!due_date) return false
  try {
    // Zoho format: MM-DD-YYYY
    const [m, d, y] = due_date.split("-").map(Number)
    return new Date(y, m - 1, d) < new Date()
  } catch { return false }
}

function formatDate(due_date?: string): string {
  if (!due_date) return ""
  try {
    const [m, d, y] = due_date.split("-").map(Number)
    return new Date(y, m - 1, d).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })
  } catch { return due_date }
}

function ownerInitials(name: string): string {
  return name.split(" ").map(p => p[0]).join("").toUpperCase().slice(0, 2)
}

// ── Inline new-task form ──────────────────────────────────────────────────────

function NewTaskRow({
  zohoProjectId,
  defaultStatus,
  onCreated,
  onCancel,
}: {
  zohoProjectId: string
  defaultStatus: string
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
      const created: ZohoTask = data.tasks?.[0] ?? {
        id: `tmp-${Date.now()}`,
        name: name.trim(),
        status: { name: defaultStatus, id: defaultStatus.toLowerCase().replace(/ /g, "") },
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
    <div className="rounded-lg border bg-card p-2 space-y-2 shadow-sm">
      <Input
        autoFocus
        placeholder="Nom de la tâche…"
        value={name}
        onChange={(e: ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
        onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => {
          if (e.key === "Enter") submit()
          if (e.key === "Escape") onCancel()
        }}
        className="h-7 text-sm"
      />
      <div className="flex items-center gap-2">
        <Select value={priority} onValueChange={setPriority}>
          <SelectTrigger className="h-7 text-xs flex-1">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PRIORITY_OPTIONS.map(p => (
              <SelectItem key={p} value={p}>{p}</SelectItem>
            ))}
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

// ── Task edit dialog ──────────────────────────────────────────────────────────

function TaskEditDialog({
  task,
  zohoProjectId,
  statuses,
  milestones,
  portalBaseUrl,
  onSave,
  onClose,
  onAssignAgent,
  agentLoading,
}: {
  task: ZohoTask
  zohoProjectId: string
  statuses: ZohoStatus[]
  milestones: ZohoMilestone[]
  portalBaseUrl?: string
  onSave: (updated: ZohoTask) => void
  onClose: () => void
  onAssignAgent: (task: ZohoTask) => void
  agentLoading: boolean
}) {
  const [name, setName] = useState(task.name)
  const [status, setStatus] = useState(task.status.name)
  const [priority, setPriority] = useState(task.priority || "None")
  const [dueDate, setDueDate] = useState(() => {
    // Convert MM-DD-YYYY → YYYY-MM-DD for <input type="date">
    if (!task.due_date) return ""
    const [m, d, y] = task.due_date.split("-")
    return `${y}-${m}-${d}`
  })
  const [pct, setPct] = useState(task.percent_complete ?? "0")
  const [description, setDescription] = useState(task.description ?? "")
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  const handleSave = async () => {
    setSaving(true)
    setSaveError(null)
    try {
      // Convert YYYY-MM-DD → MM-DD-YYYY for Zoho
      const zohoDate = dueDate
        ? dueDate.split("-").slice(1).concat(dueDate.split("-")[0]).join("-")
        : undefined

      const body: Record<string, string> = {
        name,
        priority,
        percent_complete: pct,
      }
      if (zohoDate) body.due_date = zohoDate
      if (description !== task.description) body.description = description

      if (status !== task.status.name) body.status = status

      const res = await fetch(
        `/api/zoho?action=updateTask&projectId=${zohoProjectId}&taskId=${task.id}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }
      )
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error ?? `HTTP ${res.status}`)
      }

      const updated: ZohoTask = {
        ...task,
        name,
        status: { name: status, id: status.toLowerCase().replace(/ /g, "") },
        priority,
        due_date: dueDate ? body.due_date : task.due_date,
        percent_complete: pct,
        description,
      }
      onSave(updated)
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : String(err))
    } finally {
      setSaving(false)
    }
  }

  const statusOptions = statuses.length > 0
    ? statuses.map(s => s.name)
    : ["Open", "In Progress", "In Review", "Closed"]

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base pr-6">Modifier la tâche</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-1">
          {/* Name */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Nom</label>
            <Input
              value={name}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
              className="text-sm"
            />
          </div>

          {/* Status + Priority row */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Statut</label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className="text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {statusOptions.map(s => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Priorité</label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger className="text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRIORITY_OPTIONS.map(p => (
                    <SelectItem key={p} value={p}>{p}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Due date + Completion row */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                <Calendar className="h-3 w-3" /> Date d&apos;échéance
              </label>
              <Input
                type="date"
                value={dueDate}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setDueDate(e.target.value)}
                className="text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                <Percent className="h-3 w-3" /> Avancement
              </label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={pct}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => setPct(e.target.value)}
                  className="text-sm"
                />
                <span className="text-sm text-muted-foreground shrink-0">%</span>
              </div>
            </div>
          </div>

          {/* Assignees (read-only info) */}
          {task.owner && task.owner.length > 0 && (
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                <User className="h-3 w-3" /> Assigné à
              </label>
              <div className="flex flex-wrap gap-2">
                {task.owner.map(o => (
                  <div key={o.id} className="flex items-center gap-1.5 bg-muted rounded-full px-2.5 py-1">
                    <div className="h-5 w-5 rounded-full bg-violet-500 flex items-center justify-center text-[10px] text-white font-semibold">
                      {ownerInitials(o.name)}
                    </div>
                    <span className="text-xs font-medium">{o.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tags */}
          {task.tags && task.tags.length > 0 && (
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                <Tag className="h-3 w-3" /> Tags
              </label>
              <div className="flex flex-wrap gap-1.5">
                {task.tags.map(t => (
                  <Badge key={t.name} variant="secondary" className="text-xs">{t.name}</Badge>
                ))}
              </div>
            </div>
          )}

          {/* Description */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Description</label>
            <Textarea
              value={description}
              onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setDescription(e.target.value)}
              placeholder="Ajouter une description…"
              className="text-sm min-h-[80px] resize-none"
            />
          </div>

          {/* Meta (read-only) */}
          <div className="text-xs text-muted-foreground space-y-0.5 border-t pt-3">
            {task.created_time && <p>Créée le {new Date(task.created_time).toLocaleString("fr-FR")}</p>}
            {task.last_updated_time && <p>Modifiée le {new Date(task.last_updated_time).toLocaleString("fr-FR")}</p>}
            <p>ID Zoho : {task.id}</p>
          </div>

          {/* Error */}
          {saveError && (
            <div className="flex items-start gap-2 text-sm text-red-600 bg-red-50 dark:bg-red-950/20 rounded-lg p-2.5">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span className="break-all">{saveError}</span>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-1">
            <Button className="flex-1 gap-2" onClick={handleSave} disabled={saving}>
              {saving ? "Sauvegarde…" : "Sauvegarder"}
            </Button>
            <Button
              variant="outline"
              className="gap-1.5"
              onClick={() => { onAssignAgent(task); onClose() }}
              disabled={agentLoading}
            >
              <Bot className="h-4 w-4" />
              Agent
            </Button>
            {portalBaseUrl && (
              <Button variant="outline" size="icon" asChild title="Ouvrir dans Zoho">
                <a href={zohoUiUrl(portalBaseUrl, zohoProjectId, 'tasks', task.id)} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4" />
                </a>
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ── Main board ────────────────────────────────────────────────────────────────

interface KanbanBoardProps {
  initialTasks: ZohoTask[]
  zohoProjectId: string
  portalBaseUrl?: string
  statuses?: ZohoStatus[]
  milestones?: ZohoMilestone[]
  isMock?: boolean
}

export function KanbanBoard({
  initialTasks,
  zohoProjectId,
  portalBaseUrl,
  statuses = [],
  milestones = [],
  isMock = false,
}: KanbanBoardProps) {
  const [tasks, setTasks] = useState<ZohoTask[]>(initialTasks)
  const [selected, setSelected] = useState<ZohoTask | null>(null)
  const [dragging, setDragging] = useState<string | null>(null)
  const [agentLoading, setAgentLoading] = useState<string | null>(null)
  const [addingInColumn, setAddingInColumn] = useState<string | null>(null)
  const [refreshing, startRefresh] = useTransition()

  // Build column list from Zoho statuses, or derive from tasks, or use defaults
  const columns: { id: string; label: string; color: string }[] = (() => {
    const STATUS_COLORS: Record<string, string> = {
      Open:        "border-t-slate-400",
      "In Progress": "border-t-blue-500",
      "In Review":   "border-t-amber-500",
      Closed:      "border-t-green-500",
    }
    const DEFAULT_COLOR = "border-t-violet-400"

    if (statuses.length > 0) {
      return statuses.map(s => ({
        id:    s.name,
        label: s.name,
        color: STATUS_COLORS[s.name] ?? DEFAULT_COLOR,
      }))
    }
    // Derive from tasks
    const seen = new Set<string>()
    const derived: typeof columns = []
    for (const t of tasks) {
      if (!seen.has(t.status.name)) {
        seen.add(t.status.name)
        derived.push({ id: t.status.name, label: t.status.name, color: STATUS_COLORS[t.status.name] ?? DEFAULT_COLOR })
      }
    }
    return derived.length > 0 ? derived : [
      { id: "Open",        label: "Open",        color: "border-t-slate-400" },
      { id: "In Progress", label: "In Progress", color: "border-t-blue-500"  },
      { id: "In Review",   label: "In Review",   color: "border-t-amber-500" },
      { id: "Closed",      label: "Closed",      color: "border-t-green-500" },
    ]
  })()

  const tasksByStatus = useCallback(
    (status: string) => tasks.filter((t: ZohoTask) => t.status.name === status),
    [tasks]
  )

  // Refresh from Zoho API (client-side)
  const handleRefresh = () => {
    startRefresh(async () => {
      try {
        const res = await fetch(`/api/zoho?action=listTasks&projectId=${zohoProjectId}`)
        if (res.ok) {
          const data: ZohoTask[] = await res.json()
          setTasks(data)
        }
      } catch { /* ignore */ }
    })
  }

  const handleDragStart = (taskId: string) => setDragging(taskId)
  const handleDragEnd = () => setDragging(null)

  const handleDrop = async (status: string) => {
    if (!dragging) return
    const task = tasks.find((t: ZohoTask) => t.id === dragging)
    if (!task || task.status.name === status) return

    setTasks((prev: ZohoTask[]) =>
      prev.map((t: ZohoTask) => t.id === dragging
        ? { ...t, status: { name: status, id: status.toLowerCase().replace(/ /g, "") } }
        : t
      )
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

  const handleTaskSaved = (updated: ZohoTask) => {
    setTasks((prev: ZohoTask[]) => prev.map((t: ZohoTask) => t.id === updated.id ? updated : t))
    setSelected(null)
  }

  return (
    <>
      {/* Toolbar */}
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs text-muted-foreground">
          {tasks.length} tâche{tasks.length !== 1 ? 's' : ''}
          {isMock && <span className="ml-2 text-amber-600 font-medium">(données demo)</span>}
        </p>
        <Button
          variant="outline"
          size="sm"
          className="h-7 gap-1.5 text-xs"
          onClick={handleRefresh}
          disabled={refreshing}
        >
          <RefreshCw className={cn("h-3 w-3", refreshing && "animate-spin")} />
          {refreshing ? "Actualisation…" : "Actualiser"}
        </Button>
      </div>

      {/* Board */}
      <div className="flex gap-4 overflow-x-auto pb-4 h-full">
        {columns.map(({ id, label, color }) => (
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
              {addingInColumn === id && (
                <NewTaskRow
                  zohoProjectId={zohoProjectId}
                  defaultStatus={id}
                  onCreated={handleTaskCreated}
                  onCancel={() => setAddingInColumn(null)}
                />
              )}

              {tasksByStatus(id).map((task: ZohoTask) => {
                const overdue = isOverdue(task.due_date)
                const pctNum = parseInt(task.percent_complete ?? "0", 10)
                return (
                  <Card
                    key={task.id}
                    className="cursor-grab active:cursor-grabbing select-none hover:shadow-md transition-shadow"
                    draggable
                    onDragStart={() => handleDragStart(task.id)}
                    onDragEnd={handleDragEnd}
                    onClick={() => setSelected(task)}
                  >
                    <CardContent className="p-3 space-y-2">
                      {/* Name */}
                      <div className="flex items-start justify-between gap-1">
                        <p className="text-sm font-medium leading-snug">{task.name}</p>
                        <GripVertical className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                      </div>

                      {/* Badges */}
                      <div className="flex flex-wrap gap-1">
                        {task.priority && task.priority !== "None" && (
                          <Badge variant={PRIORITY_VARIANT[task.priority] ?? "outline"} className="text-xs">
                            {task.priority}
                          </Badge>
                        )}
                        {task.tags?.map((t: { name: string }) => (
                          <Badge key={t.name} variant="secondary" className="text-xs">{t.name}</Badge>
                        ))}
                      </div>

                      {/* Progress bar (if > 0 and not closed) */}
                      {pctNum > 0 && (
                        <div className="space-y-0.5">
                          <div className="h-1 rounded-full bg-muted overflow-hidden">
                            <div
                              className="h-full bg-brand transition-all"
                              style={{ width: `${pctNum}%` }}
                            />
                          </div>
                          <p className="text-[10px] text-muted-foreground">{pctNum}% complété</p>
                        </div>
                      )}

                      {/* Footer: due date + owner + agent */}
                      <div className="flex items-center gap-2 pt-0.5">
                        {task.due_date && (
                          <span className={cn(
                            "text-[10px] flex items-center gap-0.5",
                            overdue ? "text-red-500 font-medium" : "text-muted-foreground"
                          )}>
                            <Calendar className="h-2.5 w-2.5" />
                            {formatDate(task.due_date)}
                          </span>
                        )}
                        {task.owner && task.owner.length > 0 && (
                          <div className="flex -space-x-1">
                            {task.owner.slice(0, 2).map(o => (
                              <div
                                key={o.id}
                                className="h-5 w-5 rounded-full bg-violet-500 flex items-center justify-center text-[9px] text-white font-bold ring-1 ring-background"
                                title={o.name}
                              >
                                {ownerInitials(o.name)}
                              </div>
                            ))}
                          </div>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-5 px-1 text-[10px] gap-1 ml-auto shrink-0"
                          disabled={agentLoading === task.id}
                          onClick={(e: React.MouseEvent) => { e.stopPropagation(); assignToAgent(task) }}
                        >
                          <Bot className="h-3 w-3" />
                          {agentLoading === task.id ? "…" : "Agent"}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}

              {tasksByStatus(id).length === 0 && addingInColumn !== id && (
                <button
                  className="flex items-center justify-center w-full h-14 border-2 border-dashed rounded-lg text-xs text-muted-foreground hover:border-brand/40 hover:text-brand/60 transition-colors"
                  onClick={() => setAddingInColumn(id)}
                >
                  + Ajouter une tâche
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Task edit dialog */}
      {selected && (
        <TaskEditDialog
          task={selected}
          zohoProjectId={zohoProjectId}
          statuses={statuses}
          milestones={milestones}
          portalBaseUrl={portalBaseUrl}
          onSave={handleTaskSaved}
          onClose={() => setSelected(null)}
          onAssignAgent={assignToAgent}
          agentLoading={agentLoading === selected.id}
        />
      )}
    </>
  )
}

"use client"

import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Loader2, CheckCircle2, XCircle, Clock, PauseCircle } from "lucide-react"
import { type WorkflowState } from "@/hooks/use-workflow-status"
import { cn } from "@/lib/utils"

interface WorkflowStatusProps {
  state: WorkflowState
  className?: string
}

const STATUS_CONFIG = {
  RUNNING:   { label: "Agent actif",       icon: Loader2,       className: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400", spin: true },
  COMPLETED: { label: "Terminé",           icon: CheckCircle2,  className: "bg-green-500/15 text-green-700 dark:text-green-400",       spin: false },
  FAILED:    { label: "Échec — voir logs", icon: XCircle,       className: "bg-destructive/15 text-destructive",                       spin: false },
  CANCELED:  { label: "Annulé",            icon: XCircle,       className: "bg-muted text-muted-foreground",                           spin: false },
  TIMED_OUT: { label: "Timeout",           icon: Clock,         className: "bg-orange-500/15 text-orange-700 dark:text-orange-400",    spin: false },
  UNKNOWN:   { label: "Inconnu",           icon: PauseCircle,   className: "bg-muted text-muted-foreground",                           spin: false },
} as const

export function WorkflowStatus({ state, className }: WorkflowStatusProps) {
  if (!state.status) return null

  const config = STATUS_CONFIG[state.status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.UNKNOWN
  const Icon = config.icon
  const pct = state.totalSteps > 0 ? Math.round((state.completedSteps / state.totalSteps) * 100) : 0

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center gap-2">
        <Badge className={cn("gap-1 font-normal", config.className)} variant="outline">
          <Icon className={cn("h-3.5 w-3.5", config.spin && "animate-spin")} />
          {config.label}
        </Badge>
        {state.workflowId && (
          <span className="text-xs text-muted-foreground font-mono truncate max-w-[160px]">{state.workflowId}</span>
        )}
      </div>

      {state.currentActivity && (
        <p className="text-xs text-muted-foreground">{state.currentActivity}</p>
      )}

      {state.totalSteps > 0 && (
        <div className="space-y-1">
          <Progress value={pct} className="h-1.5" />
          <p className="text-xs text-muted-foreground">{state.completedSteps}/{state.totalSteps} étapes</p>
        </div>
      )}
    </div>
  )
}

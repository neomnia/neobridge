"use client"

import { useState, useCallback } from "react"
import { useWorkflowStatus } from "./use-workflow-status"

export type AgentMode = "single" | "sprint" | "auto"

export interface AgentSession {
  workflowId: string
  mode: AgentMode
  projectId: string
  taskId?: string
  taskIds?: string[]
  startedAt: string
}

interface UseAgentSessionResult {
  activeSession: AgentSession | null
  history: AgentSession[]
  workflowState: ReturnType<typeof useWorkflowStatus>
  launch: (params: {
    mode: AgentMode
    projectId: string
    taskId?: string
    taskIds?: string[]
  }) => Promise<void>
  cancel: () => Promise<void>
  launching: boolean
  error: string | null
}

const MAX_HISTORY = 10

export function useAgentSession(): UseAgentSessionResult {
  const [activeSession, setActiveSession] = useState<AgentSession | null>(null)
  const [history, setHistory] = useState<AgentSession[]>([])
  const [launching, setLaunching] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const workflowState = useWorkflowStatus(activeSession?.workflowId ?? null)

  // When workflow reaches terminal state, archive the session
  const { status } = workflowState
  if (activeSession && status && ["COMPLETED", "FAILED", "CANCELED", "TIMED_OUT"].includes(status)) {
    setHistory((prev) => [activeSession, ...prev].slice(0, MAX_HISTORY))
    setActiveSession(null)
  }

  const launch = useCallback(async (params: {
    mode: AgentMode
    projectId: string
    taskId?: string
    taskIds?: string[]
  }) => {
    setLaunching(true)
    setError(null)
    try {
      const res = await fetch("/api/temporal/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workflow: params.mode === "sprint" ? "sprintPlanningWorkflow" : "agentSessionWorkflow",
          ...params,
        }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? `HTTP ${res.status}`)
      }
      const data = await res.json()
      const session: AgentSession = {
        workflowId: data.workflowId,
        mode: params.mode,
        projectId: params.projectId,
        taskId: params.taskId,
        taskIds: params.taskIds,
        startedAt: new Date().toISOString(),
      }
      setActiveSession(session)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLaunching(false)
    }
  }, [])

  const cancel = useCallback(async () => {
    if (!activeSession) return
    try {
      await fetch("/api/temporal/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workflowId: activeSession.workflowId }),
      })
      setHistory((prev) => [activeSession, ...prev].slice(0, MAX_HISTORY))
      setActiveSession(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    }
  }, [activeSession])

  return { activeSession, history, workflowState, launch, cancel, launching, error }
}

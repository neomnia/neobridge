"use client"

import { useEffect, useRef, useState, useCallback } from "react"

export type WorkflowStatus = "RUNNING" | "COMPLETED" | "FAILED" | "CANCELED" | "TIMED_OUT" | "UNKNOWN" | null

export interface WorkflowState {
  workflowId: string | null
  status: WorkflowStatus
  currentActivity: string | null
  completedSteps: number
  totalSteps: number
  startTime: string | null
  endTime: string | null
  error: string | null
  loading: boolean
}

const TERMINAL = new Set<WorkflowStatus>(["COMPLETED", "FAILED", "CANCELED", "TIMED_OUT"])

export function useWorkflowStatus(workflowId: string | null, pollIntervalMs = 3_000): WorkflowState {
  const [state, setState] = useState<WorkflowState>({
    workflowId,
    status: null,
    currentActivity: null,
    completedSteps: 0,
    totalSteps: 0,
    startTime: null,
    endTime: null,
    error: null,
    loading: false,
  })
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const poll = useCallback(async (id: string) => {
    setState((s) => ({ ...s, loading: true }))
    try {
      const res = await fetch(`/api/temporal/status/${encodeURIComponent(id)}`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      setState({
        workflowId: id,
        status: data.status ?? null,
        currentActivity: data.currentActivity ?? null,
        completedSteps: data.completedSteps ?? 0,
        totalSteps: data.totalSteps ?? 0,
        startTime: data.startTime ?? null,
        endTime: data.endTime ?? null,
        error: null,
        loading: false,
      })
      return data.status as WorkflowStatus
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      setState((s) => ({ ...s, error: message, loading: false }))
      return null
    }
  }, [])

  useEffect(() => {
    if (!workflowId) {
      setState((s) => ({ ...s, workflowId: null, status: null }))
      return
    }

    let active = true

    const schedule = async () => {
      if (!active) return
      const status = await poll(workflowId)
      if (!active) return
      if (status && TERMINAL.has(status)) return // stop polling on terminal state
      timerRef.current = setTimeout(schedule, pollIntervalMs)
    }

    schedule()

    return () => {
      active = false
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [workflowId, poll, pollIntervalMs])

  return state
}

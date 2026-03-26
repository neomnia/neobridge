"use client"

import { useEffect, useRef, useState, useCallback } from "react"

export interface ZohoEvent {
  type: string
  ts?: number
  taskId?: string
  taskName?: string
  status?: string
  actor?: string
  workflowId?: string
  milestoneId?: string
  name?: string
  completed?: number
  total?: number
  [key: string]: unknown
}

interface UseZohoEventsResult {
  events: ZohoEvent[]
  connected: boolean
  error: string | null
  clearEvents: () => void
}

const MAX_EVENTS = 50

export function useZohoEvents(): UseZohoEventsResult {
  const [events, setEvents] = useState<ZohoEvent[]>([])
  const [connected, setConnected] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const esRef = useRef<EventSource | null>(null)
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const connect = useCallback(() => {
    if (esRef.current) {
      esRef.current.close()
    }

    const es = new EventSource("/api/zoho/events")
    esRef.current = es

    es.onmessage = (e) => {
      try {
        const data: ZohoEvent = JSON.parse(e.data)
        if (data.type === "connected") {
          setConnected(true)
          setError(null)
          return
        }
        if (data.type === "heartbeat") return

        setEvents((prev) => [data, ...prev].slice(0, MAX_EVENTS))
      } catch {
        // ignore malformed events
      }
    }

    es.onerror = () => {
      setConnected(false)
      es.close()
      // Reconnect after 5s
      reconnectTimer.current = setTimeout(connect, 5_000)
    }
  }, [])

  useEffect(() => {
    connect()
    return () => {
      esRef.current?.close()
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current)
    }
  }, [connect])

  const clearEvents = useCallback(() => setEvents([]), [])

  return { events, connected, error, clearEvents }
}

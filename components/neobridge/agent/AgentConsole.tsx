"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { WorkflowStatus } from "@/components/neobridge/WorkflowStatus"
import { useAgentSession, type AgentMode } from "@/hooks/use-agent-session"
import { useZohoEvents } from "@/hooks/use-zoho-events"
import { Play, Square, Clock, Bot } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { fr } from "date-fns/locale"
import { type ZohoProject } from "@/lib/zoho"

interface AgentConsoleProps {
  projects: ZohoProject[]
}

const MODE_LABELS: Record<AgentMode, string> = {
  single: "Tâche unique",
  sprint: "Sprint",
  auto:   "Auto",
}

export function AgentConsole({ projects }: AgentConsoleProps) {
  const [mode, setMode] = useState<AgentMode>("single")
  const [projectId, setProjectId] = useState(projects[0]?.id ?? "")
  const { activeSession, history, workflowState, launch, cancel, launching, error } = useAgentSession()
  const { events } = useZohoEvents()

  const liveLog = events
    .filter((e) => e.type !== "heartbeat" && e.type !== "connected")
    .slice(0, 20)

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full">
      {/* Left panel — controls */}
      <div className="space-y-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Bot className="h-4 w-4" />
              Nouvelle session
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Mode</label>
              <Select value={mode} onValueChange={(v) => setMode(v as AgentMode)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(["single", "sprint", "auto"] as AgentMode[]).map((m) => (
                    <SelectItem key={m} value={m}>{MODE_LABELS[m]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Projet Zoho</label>
              <Select value={projectId} onValueChange={setProjectId}>
                <SelectTrigger><SelectValue placeholder="Sélectionner un projet" /></SelectTrigger>
                <SelectContent>
                  {projects.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {error && <p className="text-xs text-destructive">{error}</p>}

            <div className="flex gap-2">
              <Button
                className="flex-1 gap-2"
                onClick={() => launch({ mode, projectId })}
                disabled={launching || !!activeSession || !projectId}
              >
                <Play className="h-4 w-4" />
                {launching ? "Démarrage…" : "Lancer la session"}
              </Button>
              {activeSession && (
                <Button variant="destructive" size="icon" onClick={cancel}>
                  <Square className="h-4 w-4" />
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Active session status */}
        {activeSession && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Session active</CardTitle>
            </CardHeader>
            <CardContent>
              <WorkflowStatus state={workflowState} />
              <div className="mt-3 text-xs text-muted-foreground space-y-1">
                <p>Mode : {MODE_LABELS[activeSession.mode]}</p>
                <p>Démarrée {formatDistanceToNow(new Date(activeSession.startedAt), { locale: fr, addSuffix: true })}</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* History */}
        {history.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Historique ({history.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-48">
                {history.map((s, i) => (
                  <div key={i} className="px-4 py-2 border-b last:border-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-mono truncate">{s.workflowId}</span>
                      <Badge variant="secondary" className="text-xs">{MODE_LABELS[s.mode]}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(s.startedAt), { locale: fr, addSuffix: true })}
                    </p>
                  </div>
                ))}
              </ScrollArea>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Right panel — live log */}
      <Card className="flex flex-col">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Log en temps réel</CardTitle>
        </CardHeader>
        <Separator />
        <CardContent className="flex-1 p-0">
          <ScrollArea className="h-full min-h-64 p-4 font-mono text-xs">
            {liveLog.length === 0 ? (
              <p className="text-muted-foreground">En attente d&apos;événements…</p>
            ) : (
              liveLog.map((e, i) => (
                <div key={i} className="py-0.5">
                  <span className="text-muted-foreground mr-2">{new Date(e.ts ?? Date.now()).toLocaleTimeString()}</span>
                  <span className="text-primary">[{e.type}]</span>{" "}
                  <span>{e.taskName ?? e.name ?? e.workflowId ?? JSON.stringify(e)}</span>
                </div>
              ))
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  )
}

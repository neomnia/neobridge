"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useZohoEvents, type ZohoEvent } from "@/hooks/use-zoho-events"
import { formatDistanceToNow } from "date-fns"
import { fr } from "date-fns/locale"

const EVENT_LABELS: Record<string, string> = {
  task_updated:      "Tâche mise à jour",
  task_completed:    "Tâche terminée",
  task_created:      "Tâche créée",
  agent_started:     "Agent démarré",
  milestone_updated: "Jalon mis à jour",
}

function EventRow({ event }: { event: ZohoEvent }) {
  const label = EVENT_LABELS[event.type] ?? event.type
  const ts = event.ts ? new Date(event.ts) : new Date()

  return (
    <div className="flex items-start gap-3 py-2 border-b last:border-0">
      <Badge variant="secondary" className="text-xs shrink-0 mt-0.5">{label}</Badge>
      <div className="flex-1 min-w-0">
        <p className="text-sm truncate">
          {event.taskName ?? event.name ?? event.workflowId ?? "—"}
        </p>
        {event.actor && <p className="text-xs text-muted-foreground">{event.actor}</p>}
      </div>
      <span className="text-xs text-muted-foreground shrink-0">
        {formatDistanceToNow(ts, { locale: fr, addSuffix: true })}
      </span>
    </div>
  )
}

export function RecentActivity() {
  const { events, connected } = useZohoEvents()

  return (
    <Card className="flex flex-col h-full">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">Activité récente</CardTitle>
          <Badge variant={connected ? "default" : "secondary"} className="text-xs">
            {connected ? "Live" : "Déconnecté"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="flex-1 p-0">
        <ScrollArea className="h-64 px-4">
          {events.length === 0 ? (
            <div className="flex items-center justify-center h-24 text-sm text-muted-foreground">
              En attente d&apos;événements…
            </div>
          ) : (
            events.map((e, i) => <EventRow key={i} event={e} />)
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  )
}

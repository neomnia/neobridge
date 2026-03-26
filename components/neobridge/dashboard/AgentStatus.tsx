"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { WorkflowStatus } from "@/components/neobridge/WorkflowStatus"
import { useWorkflowStatus } from "@/hooks/use-workflow-status"
import { RotateCcw, ExternalLink } from "lucide-react"
import Link from "next/link"

interface AgentStatusProps {
  lastWorkflowId: string | null
}

export function AgentStatus({ lastWorkflowId }: AgentStatusProps) {
  const state = useWorkflowStatus(lastWorkflowId, 5_000)

  return (
    <Card>
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <CardTitle className="text-sm font-medium">Dernière session agent</CardTitle>
        <Link href="/neobridge/agent">
          <Button variant="ghost" size="sm" className="gap-1 text-xs">
            <ExternalLink className="h-3.5 w-3.5" />
            Ouvrir
          </Button>
        </Link>
      </CardHeader>
      <CardContent className="space-y-3">
        {lastWorkflowId ? (
          <WorkflowStatus state={state} />
        ) : (
          <div className="flex flex-col items-center gap-3 py-4">
            <p className="text-sm text-muted-foreground text-center">Aucune session démarrée</p>
            <Link href="/neobridge/agent">
              <Button size="sm" className="gap-1.5">
                <RotateCcw className="h-3.5 w-3.5" />
                Lancer un agent
              </Button>
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

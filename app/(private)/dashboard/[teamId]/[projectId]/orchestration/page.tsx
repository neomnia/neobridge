import { AgentConsole } from '@/components/neobridge/agent/AgentConsole'
import { listZohoProjects } from '@/lib/zoho-data'
import { Bot } from 'lucide-react'

export const metadata = { title: 'Orchestration — NeoBridge' }

export default async function OrchestrationPage({
  params: _params,
}: {
  params: Promise<{ teamId: string; projectId: string }>
}) {
  const projects = await listZohoProjects()

  return (
    <div className="flex flex-col h-full space-y-4">
      <div className="flex items-center gap-3">
        <Bot className="h-6 w-6 text-muted-foreground" />
        <div>
          <h2 className="text-xl font-semibold">Orchestration</h2>
          <p className="text-muted-foreground text-sm mt-0.5">
            Temporal + Agent IA — contrôle et monitoring des sessions multi-agents
          </p>
        </div>
      </div>
      <div className="flex-1">
        <AgentConsole projects={projects} />
      </div>
    </div>
  )
}

import { AgentConsole } from '@/components/neobridge/agent/AgentConsole'
import { listZohoProjects } from '@/lib/zoho-data'

export default async function AgentPage() {
  const projects = await listZohoProjects()

  return (
    <div className="flex flex-col h-full space-y-4">
      <div>
        <h2 className="text-xl font-semibold">Agent Console</h2>
        <p className="text-muted-foreground text-sm mt-0.5">Contrôle et monitoring des sessions multi-agents</p>
      </div>
      <div className="flex-1">
        <AgentConsole projects={projects} />
      </div>
    </div>
  )
}

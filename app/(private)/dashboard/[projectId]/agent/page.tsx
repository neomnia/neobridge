import { AgentConsole } from '@/components/neobridge/agent/AgentConsole'
import { type ZohoProject } from '@/lib/zoho'

async function fetchProjects(): Promise<ZohoProject[]> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
    const res = await fetch(`${baseUrl}/api/zoho?action=listProjects`, { next: { revalidate: 300 } })
    if (!res.ok) return []
    return res.json()
  } catch {
    return []
  }
}

export default async function AgentPage() {
  const projects = await fetchProjects()

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

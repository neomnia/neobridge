import { AgentConsole } from "@/components/neobridge/agent/AgentConsole"
import { type ZohoProject } from "@/lib/zoho"

export const metadata = { title: "Agent Console — NeoBridge" }

async function fetchProjects(): Promise<ZohoProject[]> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"
    const res = await fetch(`${baseUrl}/api/zoho?action=listProjects`, {
      next: { revalidate: 300 },
    })
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
        <h1 className="text-2xl font-bold">Agent Console</h1>
        <p className="text-muted-foreground text-sm mt-1">Contrôle et monitoring des sessions multi-agents</p>
      </div>
      <div className="flex-1">
        <AgentConsole projects={projects} />
      </div>
    </div>
  )
}

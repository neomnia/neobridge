import { serviceApiRepository } from '@/lib/services'
import { syncVercelTeams, listVercelProjects } from '@/lib/connectors/vercel'
import { LogsProjectPicker } from '@/components/dashboard/logs-project-picker'

export const metadata = { title: 'Logs — NeoBridge' }
export const dynamic = 'force-dynamic'

interface ProjectEntry {
  name: string
  teamSlug: string
  framework: string | null
}

async function fetchProjects(): Promise<ProjectEntry[]> {
  try {
    const config = await serviceApiRepository.getConfig('vercel', 'production')
    const token = (config?.config as Record<string, unknown>)?.apiToken as string | undefined
    if (!token) return []
    const teams = await syncVercelTeams(token)
    const grouped = await Promise.all(
      teams.map(async (team) => {
        const projects = await listVercelProjects(team.id, token)
        return projects.map<ProjectEntry>((p) => ({
          name: p.name, teamSlug: team.slug, framework: p.framework,
        }))
      }),
    )
    return grouped.flat().sort((a, b) => a.name.localeCompare(b.name))
  } catch {
    return []
  }
}

export default async function GlobalLogsPage() {
  const projects = await fetchProjects()
  return <LogsProjectPicker projects={projects} />
}

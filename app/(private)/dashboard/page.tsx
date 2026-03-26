import { NewProjectDialog } from '@/components/neobridge/projects/NewProjectDialog'
import { ProjectCard } from '@/components/neobridge/projects/ProjectCard'
import { ImpersonationBanner } from '@/components/admin/impersonation-banner'
import type { Project } from '@/db/schema'

async function fetchProjects(): Promise<Project[]> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
    const res = await fetch(`${baseUrl}/api/projects`, { cache: 'no-store' })
    if (!res.ok) return []
    return res.json()
  } catch {
    return []
  }
}

export const metadata = { title: 'Mes projets — NeoBridge' }

export default async function DashboardPage() {
  const projects = await fetchProjects()

  return (
    <div className="space-y-6">
      <ImpersonationBanner />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Mes projets</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {projects.length} projet{projects.length !== 1 ? 's' : ''}
          </p>
        </div>
        <NewProjectDialog />
      </div>

      {projects.length === 0 ? (
        <div className="flex flex-col items-center justify-center border border-dashed rounded-lg py-20 text-center">
          <p className="text-muted-foreground font-medium">Aucun projet pour l&apos;instant</p>
          <p className="text-sm text-muted-foreground mt-1">Créez votre premier projet pour commencer</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map(project => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      )}
    </div>
  )
}

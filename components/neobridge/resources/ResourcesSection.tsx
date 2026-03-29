"use client"

import { useCallback, useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Plus, Server } from "lucide-react"
import { ResourceCard } from "./ResourceCard"
import type { ProjectResource } from "@/db/schema"

interface ResourcesSectionProps {
  projectId: string
}

export function ResourcesSection({ projectId }: ResourcesSectionProps) {
  const [resources, setResources] = useState<ProjectResource[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/projects/${projectId}/resources`)
      if (res.ok) {
        const data: { success: boolean; data: ProjectResource[] } = await res.json()
        setResources(data.data ?? [])
      }
    } finally {
      setLoading(false)
    }
  }, [projectId])

  useEffect(() => { load() }, [load])

  const handleDeleted = (id: string) => setResources((prev) => prev.filter((r) => r.id !== id))

  if (loading) {
    return (
      <div className="flex justify-center py-10">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-brand border-t-transparent" />
      </div>
    )
  }

  if (resources.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center border border-dashed rounded-lg py-12 text-center">
        <Server className="h-8 w-8 text-muted-foreground mb-3" />
        <p className="text-sm text-muted-foreground font-medium">Aucune ressource mappée</p>
        <p className="text-xs text-muted-foreground mt-1">
          Vercel, Railway, Scaleway, Neon…
        </p>
        <Button size="sm" className="mt-4">
          <Plus className="h-4 w-4 mr-2" />Mapper une ressource
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {resources.map((r) => (
          <ResourceCard key={r.id} resource={r} projectId={projectId} onDeleted={handleDeleted} />
        ))}
      </div>
      <Button size="sm" variant="outline">
        <Plus className="h-4 w-4 mr-2" />Mapper une ressource
      </Button>
    </div>
  )
}

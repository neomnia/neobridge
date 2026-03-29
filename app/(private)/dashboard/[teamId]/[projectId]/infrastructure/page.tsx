"use client"

import { useCallback, useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Plus, Server } from "lucide-react"
import { ResourceCard } from "@/components/neobridge/resources/ResourceCard"
import type { ProjectResource } from "@/db/schema"

export default function InfrastructurePage() {
  const { projectId } = useParams<{ projectId: string }>()
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

  const handleDeleted = (id: string) => {
    setResources((prev) => prev.filter((r) => r.id !== id))
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Infrastructure</h2>
          <p className="text-muted-foreground text-sm mt-0.5">
            Ressources déployées sur ce projet — Vercel, Railway, Scaleway, Neon
          </p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Mapper une ressource
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand border-t-transparent" />
        </div>
      ) : resources.length === 0 ? (
        <div className="flex flex-col items-center justify-center border border-dashed rounded-lg py-20 text-center">
          <Server className="h-10 w-10 text-muted-foreground mb-3" />
          <p className="text-muted-foreground font-medium">Aucune ressource mappée</p>
          <p className="text-sm text-muted-foreground mt-1">
            Associez une ressource Vercel, Railway, Scaleway ou Neon à ce projet
          </p>
          <Button className="mt-4">
            <Plus className="h-4 w-4 mr-2" />
            Mapper une ressource
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {resources.map((r) => (
            <ResourceCard
              key={r.id}
              resource={r}
              projectId={projectId}
              onDeleted={handleDeleted}
            />
          ))}
        </div>
      )}
    </div>
  )
}

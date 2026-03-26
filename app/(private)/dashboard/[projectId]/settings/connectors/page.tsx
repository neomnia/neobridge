'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { ConnectorCard } from '@/components/neobridge/connectors/ConnectorCard'
import { ConnectorForm } from '@/components/neobridge/connectors/ConnectorForm'
import type { ProjectConnector } from '@/db/schema'

export default function ConnectorsPage() {
  const params = useParams<{ projectId: string }>()
  const projectId = params.projectId
  const [connectors, setConnectors] = useState<ProjectConnector[]>([])

  const load = useCallback(async () => {
    const res = await fetch(`/api/projects/${projectId}/connectors`)
    if (res.ok) setConnectors(await res.json())
  }, [projectId])

  useEffect(() => { load() }, [load])

  const deleteConnector = async (id: string) => {
    await fetch(`/api/projects/${projectId}/connectors/${id}`, { method: 'DELETE' })
    setConnectors(prev => prev.filter(c => c.id !== id))
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Connecteurs</h2>
          <p className="text-muted-foreground text-sm mt-0.5">
            Gérez les services externes connectés à ce projet
          </p>
        </div>
        <ConnectorForm projectId={projectId} onCreated={load} />
      </div>

      {connectors.length === 0 ? (
        <div className="flex flex-col items-center justify-center border border-dashed rounded-lg py-16 text-center">
          <p className="text-muted-foreground font-medium">Aucun connecteur</p>
          <p className="text-sm text-muted-foreground mt-1">
            Ajoutez Vercel, GitHub, Zoho ou d&apos;autres services pour alimenter ce projet
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {connectors.map(c => (
            <ConnectorCard key={c.id} connector={c} onDelete={deleteConnector} />
          ))}
        </div>
      )}
    </div>
  )
}

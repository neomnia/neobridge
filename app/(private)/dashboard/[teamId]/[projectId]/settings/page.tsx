'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from '@/components/ui/command'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { ConnectorCard } from '@/components/neobridge/connectors/ConnectorCard'
import { ConnectorForm } from '@/components/neobridge/connectors/ConnectorForm'
import type { ProjectConnector } from '@/db/schema'
import { Settings, ChevronsUpDown, Check } from 'lucide-react'
import { cn } from '@/lib/utils'

type Platform = 'vercel' | 'railway' | 'scaleway'

const PLATFORMS: { value: Platform; label: string }[] = [
  { value: 'vercel',   label: 'Vercel' },
  { value: 'railway',  label: 'Railway' },
  { value: 'scaleway', label: 'Scaleway' },
]

export default function SettingsPage() {
  const params = useParams<{ projectId: string }>()
  const projectId = params.projectId

  const [connectors, setConnectors] = useState<ProjectConnector[]>([])
  const [selectedPlatform, setSelectedPlatform] = useState<Platform | null>(null)
  const [open, setOpen] = useState(false)

  const load = useCallback(async () => {
    const res = await fetch(`/api/projects/${projectId}/connectors`)
    if (res.ok) setConnectors(await res.json())
  }, [projectId])

  useEffect(() => { load() }, [load])

  const deleteConnector = async (id: string) => {
    await fetch(`/api/projects/${projectId}/connectors/${id}`, { method: 'DELETE' })
    setConnectors((prev) => prev.filter((c) => c.id !== id))
  }

  const filteredConnectors = selectedPlatform
    ? connectors.filter((c) => c.provider === selectedPlatform)
    : connectors

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Settings className="h-6 w-6 text-muted-foreground" />
        <div>
          <h2 className="text-xl font-semibold">Paramètres</h2>
          <p className="text-muted-foreground text-sm mt-0.5">
            Infrastructure Mapping — connecteurs et ressources du projet
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-4">
            <div>
              <CardTitle className="text-base">Connecteurs</CardTitle>
              <CardDescription>
                Services externes connectés à ce projet
              </CardDescription>
            </div>
            <ConnectorForm projectId={projectId} onCreated={load} />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Platform filter combobox */}
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">Filtrer par plateforme :</span>
            <Popover open={open} onOpenChange={setOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={open}
                  className="w-44 justify-between"
                >
                  {selectedPlatform
                    ? PLATFORMS.find((p) => p.value === selectedPlatform)?.label
                    : 'Toutes les plateformes'}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-44 p-0">
                <Command>
                  <CommandInput placeholder="Rechercher..." />
                  <CommandEmpty>Aucune plateforme trouvée</CommandEmpty>
                  <CommandGroup>
                    <CommandItem
                      value=""
                      onSelect={() => {
                        setSelectedPlatform(null)
                        setOpen(false)
                      }}
                    >
                      <Check
                        className={cn(
                          'mr-2 h-4 w-4',
                          selectedPlatform === null ? 'opacity-100' : 'opacity-0',
                        )}
                      />
                      Toutes
                    </CommandItem>
                    {PLATFORMS.map((p) => (
                      <CommandItem
                        key={p.value}
                        value={p.value}
                        onSelect={(v) => {
                          setSelectedPlatform(v as Platform)
                          setOpen(false)
                        }}
                      >
                        <Check
                          className={cn(
                            'mr-2 h-4 w-4',
                            selectedPlatform === p.value ? 'opacity-100' : 'opacity-0',
                          )}
                        />
                        {p.label}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </Command>
              </PopoverContent>
            </Popover>
            {selectedPlatform && (
              <Badge variant="secondary">{selectedPlatform}</Badge>
            )}
          </div>

          {/* Connectors list */}
          {filteredConnectors.length === 0 ? (
            <div className="flex flex-col items-center justify-center border border-dashed rounded-lg py-12 text-center">
              <p className="text-muted-foreground font-medium">Aucun connecteur</p>
              <p className="text-sm text-muted-foreground mt-1">
                Ajoutez Vercel, Railway, Scaleway ou d&apos;autres services
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {filteredConnectors.map((c) => (
                <ConnectorCard key={c.id} connector={c} onDelete={deleteConnector} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

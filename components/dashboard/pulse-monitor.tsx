"use client"

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Activity, GitBranch, Zap, Bot, CheckCircle2, Clock, AlertTriangle } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { fr } from 'date-fns/locale'
import { cn } from '@/lib/utils'

interface PulseEvent {
  id: string
  type: 'deploy' | 'build' | 'alert' | 'ai'
  title: string
  detail: string
  ts: number
  status: 'ok' | 'error' | 'running'
}

interface GhostStep {
  label: string
  done: boolean
  active: boolean
}

const MOCK_EVENTS: PulseEvent[] = [
  { id: '1', type: 'deploy',  title: 'neobridge déployé',         detail: 'prod · 42s',       ts: Date.now() - 1000 * 60 * 8,  status: 'ok' },
  { id: '2', type: 'build',   title: 'CI neobridge-api',          detail: 'main · ✓ 2m10s',  ts: Date.now() - 1000 * 60 * 25, status: 'ok' },
  { id: '3', type: 'ai',      title: 'Chat · 3 sessions actives', detail: 'Claude Haiku',     ts: Date.now() - 1000 * 60 * 40, status: 'running' },
  { id: '4', type: 'alert',   title: 'Erreur 500 · admin/api',    detail: '2 occurrences',    ts: Date.now() - 1000 * 60 * 62, status: 'error' },
  { id: '5', type: 'deploy',  title: 'neobridge-docs déployé',    detail: 'prod · 38s',       ts: Date.now() - 1000 * 60 * 90, status: 'ok' },
]

const GHOST_STEPS_INITIAL: GhostStep[] = [
  { label: 'Analyse du dépôt', done: false, active: false },
  { label: 'Détection des patterns', done: false, active: false },
  { label: 'Génération du plan', done: false, active: false },
  { label: 'Revue des dépendances', done: false, active: false },
  { label: 'Rapport disponible', done: false, active: false },
]

const EVENT_ICON: Record<PulseEvent['type'], React.ReactNode> = {
  deploy: <Zap className="h-3.5 w-3.5" />,
  build:  <GitBranch className="h-3.5 w-3.5" />,
  alert:  <AlertTriangle className="h-3.5 w-3.5" />,
  ai:     <Bot className="h-3.5 w-3.5" />,
}

const EVENT_COLOR: Record<PulseEvent['status'], string> = {
  ok:      'text-green-500',
  error:   'text-destructive',
  running: 'text-brand',
}

export function PulseMonitor() {
  const [events] = useState<PulseEvent[]>(MOCK_EVENTS)
  const [steps, setSteps] = useState<GhostStep[]>(GHOST_STEPS_INITIAL)
  const [ghostActive, setGhostActive] = useState(false)

  // Animate Ghost Dev Monitor on mount
  useEffect(() => {
    let current = 0
    setGhostActive(true)

    const interval = setInterval(() => {
      setSteps((prev) =>
        prev.map((s, i) => ({
          ...s,
          done:   i < current,
          active: i === current,
        })),
      )
      current++
      if (current > GHOST_STEPS_INITIAL.length) {
        clearInterval(interval)
        setGhostActive(false)
      }
    }, 900)

    return () => clearInterval(interval)
  }, [])

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

      {/* Le Pulse */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Activity className="h-4 w-4 text-brand" />
            Le Pulse
            <span className="ml-auto flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-[10px] font-normal text-muted-foreground">Live</span>
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 pb-4">
          {events.map((ev) => (
            <div key={ev.id} className="flex items-start gap-3 py-1.5">
              <div className={cn('mt-0.5 shrink-0', EVENT_COLOR[ev.status])}>
                {EVENT_ICON[ev.type]}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{ev.title}</p>
                <p className="text-xs text-muted-foreground">{ev.detail}</p>
              </div>
              <span className="text-[10px] text-muted-foreground shrink-0 mt-0.5">
                {formatDistanceToNow(new Date(ev.ts), { addSuffix: true, locale: fr })}
              </span>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Ghost Dev Monitor */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Bot className="h-4 w-4 text-purple-500" />
            Ghost Dev Monitor
            {ghostActive && (
              <Badge variant="outline" className="ml-auto text-[10px] text-purple-500 border-purple-500/30">
                analyse…
              </Badge>
            )}
            {!ghostActive && (
              <Badge variant="outline" className="ml-auto text-[10px] text-green-600 border-green-500/30">
                prêt
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 pb-4">
          {steps.map((step, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className={cn(
                'shrink-0',
                step.done   ? 'text-green-500'
                : step.active ? 'text-brand'
                : 'text-muted-foreground/40',
              )}>
                {step.done ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : step.active ? (
                  <Clock className="h-4 w-4 animate-pulse" />
                ) : (
                  <Clock className="h-4 w-4" />
                )}
              </div>
              <p className={cn(
                'text-sm',
                step.done   ? 'text-foreground'
                : step.active ? 'text-foreground font-medium'
                : 'text-muted-foreground/60',
              )}>
                {step.label}
              </p>
            </div>
          ))}
          {!ghostActive && (
            <p className="text-xs text-muted-foreground mt-2 pt-2 border-t">
              Prochaine analyse automatique dans 6h · IA activée
            </p>
          )}
        </CardContent>
      </Card>

    </div>
  )
}

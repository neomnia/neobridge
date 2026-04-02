'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Loader2, CheckCircle2, XCircle, Zap } from 'lucide-react'

interface ServiceTestButtonProps {
  serviceId: string
  serviceName: string
}

export function ServiceTestButton({ serviceId, serviceName }: ServiceTestButtonProps) {
  const [state, setState] = useState<'idle' | 'testing' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState('')
  const [responseTime, setResponseTime] = useState<number | null>(null)

  async function handleTest() {
    setState('testing')
    setMessage('')
    setResponseTime(null)

    try {
      const res = await fetch(`/api/services/${serviceId}/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ environment: 'production' }),
      })
      const data = await res.json()

      if (data.success) {
        setState('success')
        setMessage(data.message)
        setResponseTime(data.responseTime ?? null)
      } else {
        setState('error')
        setMessage(data.message || 'Échec du test')
      }
    } catch {
      setState('error')
      setMessage('Erreur réseau — impossible de joindre le service')
    }

    // Reset to idle after 8s
    setTimeout(() => {
      setState('idle')
      setMessage('')
      setResponseTime(null)
    }, 8000)
  }

  return (
    <div className="space-y-1.5">
      <Button
        variant="ghost"
        size="sm"
        className="h-7 text-xs gap-1.5 px-2"
        onClick={handleTest}
        disabled={state === 'testing'}
      >
        {state === 'testing' ? (
          <>
            <Loader2 className="h-3 w-3 animate-spin" />
            Test en cours…
          </>
        ) : state === 'success' ? (
          <>
            <CheckCircle2 className="h-3 w-3 text-green-500" />
            Connecté
          </>
        ) : state === 'error' ? (
          <>
            <XCircle className="h-3 w-3 text-red-500" />
            Échec
          </>
        ) : (
          <>
            <Zap className="h-3 w-3" />
            Tester la connexion
          </>
        )}
      </Button>

      {message && (
        <p className={`text-[11px] leading-tight ${state === 'success' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
          {message}
          {responseTime !== null && state === 'success' && (
            <span className="text-muted-foreground ml-1">({responseTime}ms)</span>
          )}
        </p>
      )}
    </div>
  )
}

import { Badge } from '@/components/ui/badge'
import { CheckCircle2, XCircle, Clock } from 'lucide-react'

type ConnectorStatusValue = 'connected' | 'disconnected' | 'pending'

interface ConnectorStatusProps {
  status: ConnectorStatusValue
}

const CONFIG: Record<ConnectorStatusValue, { label: string; variant: 'default' | 'destructive' | 'secondary'; icon: React.ElementType }> = {
  connected:    { label: 'Connecté',      variant: 'default',     icon: CheckCircle2 },
  disconnected: { label: 'Déconnecté',    variant: 'destructive', icon: XCircle },
  pending:      { label: 'En attente',    variant: 'secondary',   icon: Clock },
}

export function ConnectorStatus({ status }: ConnectorStatusProps) {
  const { label, variant, icon: Icon } = CONFIG[status]
  return (
    <Badge variant={variant} className="gap-1 text-xs">
      <Icon className="h-3 w-3" />
      {label}
    </Badge>
  )
}

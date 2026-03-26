import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ConnectorStatus } from './ConnectorStatus'
import { Trash2 } from 'lucide-react'
import type { ProjectConnector } from '@/db/schema'

const TYPE_LABELS: Record<string, string> = {
  vercel:   'Vercel',
  github:   'GitHub',
  zoho:     'Zoho Projects',
  railway:  'Railway',
  scaleway: 'Scaleway',
  temporal: 'Temporal',
  notion:   'Notion',
}

interface ConnectorCardProps {
  connector: ProjectConnector
  onDelete: (id: string) => void
}

export function ConnectorCard({ connector, onDelete }: ConnectorCardProps) {
  return (
    <Card>
      <CardHeader className="pb-2 flex flex-row items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs font-mono">{TYPE_LABELS[connector.type] ?? connector.type}</Badge>
          <span className="text-sm font-medium">{connector.label}</span>
        </div>
        <ConnectorStatus status="connected" />
      </CardHeader>
      <CardContent className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground font-mono">
          {connector.type === 'vercel' && (connector.config as { projectId?: string }).projectId}
          {connector.type === 'github' && `${(connector.config as { owner?: string }).owner}/${(connector.config as { repo?: string }).repo}`}
          {connector.type === 'zoho' && (connector.config as { portalId?: string }).portalId}
        </p>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-destructive"
          onClick={() => onDelete(connector.id)}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </CardContent>
    </Card>
  )
}

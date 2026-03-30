import { Separator } from '@/components/ui/separator'
import { SpendingSection } from '@/components/dashboard/spending-section'
import { DollarSign } from 'lucide-react'

export const metadata = { title: 'Coûts — NeoBridge' }

export default function GlobalCostsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <DollarSign className="h-6 w-6 text-muted-foreground" />
        <div>
          <h1 className="text-2xl font-bold">Coûts globaux</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Dépenses consolidées de tous les services — Mars 2026
          </p>
        </div>
      </div>

      <Separator />

      <SpendingSection />
    </div>
  )
}

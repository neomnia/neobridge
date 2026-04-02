import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { CreateProjectForm } from '@/components/neobridge/create-project-form'

export const metadata = { title: 'Nouveau projet — NeoBridge' }

export default async function NewProjectPage({
  params,
}: {
  params: Promise<{ teamId: string }>
}) {
  const { teamId } = await params

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Créer un projet NeoBridge</h1>
          <p className="text-sm text-muted-foreground mt-1">
            NeoBridge crée le projet maître et prépare les liaisons Vercel, GitHub, Neon, Zoho, Railway et Temporal.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href={`/dashboard/${teamId}`}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour aux projets
          </Link>
        </Button>
      </div>

      <CreateProjectForm teamId={teamId} />
    </div>
  )
}

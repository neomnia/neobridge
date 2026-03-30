import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { ArrowLeft, Construction } from 'lucide-react'

export const metadata = { title: 'Nouveau projet — NeoBridge' }

export default async function NewProjectPage({
  params,
}: {
  params: Promise<{ teamId: string }>
}) {
  const { teamId } = await params

  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] gap-6">
      <Card className="w-full max-w-md">
        <CardContent className="pt-8 pb-8 flex flex-col items-center text-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted">
            <Construction className="h-7 w-7 text-muted-foreground" />
          </div>
          <div>
            <h2 className="text-xl font-semibold">Nouveau projet</h2>
            <p className="text-sm text-muted-foreground mt-2 max-w-xs">
              La création de projets depuis NeoBridge sera disponible prochainement.
              En attendant, créez votre projet directement sur Vercel.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 w-full">
            <Button asChild variant="outline" className="flex-1">
              <Link href={`/dashboard/${teamId}`}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Retour
              </Link>
            </Button>
            <Button asChild className="flex-1" target="_blank" rel="noreferrer">
              <a href="https://vercel.com/new">
                Créer sur Vercel →
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

import Link from 'next/link'
import { ChevronRight } from 'lucide-react'

export default async function TeamLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ teamId: string }>
}) {
  const { teamId } = await params

  // TODO: fetch team name from API when available
  const teamName = teamId.charAt(0).toUpperCase() + teamId.slice(1)

  return (
    <div className="space-y-6">
      <nav className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <Link href="/dashboard" className="hover:text-foreground transition-colors">
          Dashboard
        </Link>
        <ChevronRight className="h-4 w-4" />
        <span className="text-foreground font-medium">{teamName}</span>
      </nav>

      {children}
    </div>
  )
}

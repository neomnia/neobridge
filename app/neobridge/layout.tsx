import { redirect } from "next/navigation"
import { requireAuth } from "@/lib/auth/server"
import { NeoBridgeSidebar } from "@/components/neobridge/Sidebar"
import { NeoBridgeHeader } from "@/components/neobridge/Header"

export const dynamic = "force-dynamic"

export default async function NeoBridgeLayout({ children }: { children: React.ReactNode }) {
  let user
  try {
    user = await requireAuth()
  } catch {
    redirect("/auth/login?next=/neobridge/dashboard")
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <NeoBridgeSidebar />
      <div className="flex flex-col flex-1 overflow-hidden">
        <NeoBridgeHeader user={user} />
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  )
}

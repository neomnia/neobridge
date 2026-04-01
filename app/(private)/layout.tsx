import type React from "react"
import { redirect } from "next/navigation"
import { requireAuth, isAdmin } from "@/lib/auth/server"
import { PrivateLayoutClient } from "./layout-client"
import { getPlatformConfig } from "@/lib/config"
import { AdminAlerts } from "@/components/admin/admin-alerts"

// Force dynamic rendering for maintenance mode check
export const dynamic = 'force-dynamic'
// Give DB queries time to wake up from cold start (Neon serverless)
export const maxDuration = 30

/**
 * Private Layout - Server Component
 *
 * This layout replaces middleware auth logic for Next.js 16.
 * It verifies authentication server-side before rendering protected routes.
 * It also checks maintenance mode and redirects non-admin users.
 */
export default async function PrivateLayout({ children }: { children: React.ReactNode }) {
  // Verify authentication - redirects to login if not authenticated
  const user = await requireAuth()
  // Race isAdmin against a 8s timeout — if Neon is cold, default to false
  // rather than letting the entire layout function time out with a 500.
  const timeout = <T>(ms: number, fallback: T): Promise<T> =>
    new Promise(resolve => setTimeout(() => resolve(fallback), ms))
  const [platformConfig, userIsAdmin] = await Promise.all([
    getPlatformConfig(),
    Promise.race([isAdmin(user.userId), timeout(8000, false)]),
  ])

  // Check maintenance mode - redirect non-admin users to maintenance page
  if (platformConfig.maintenanceMode) {
    if (!userIsAdmin) {
      redirect("/maintenance")
    }
  }

  const alerts = userIsAdmin ? <AdminAlerts /> : null

  return <PrivateLayoutClient user={user} platformConfig={platformConfig} alerts={alerts}>{children}</PrivateLayoutClient>
}

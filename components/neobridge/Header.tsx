"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { ThemeToggle } from "@/components/common/theme-toggle"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { type JWTPayload } from "@/lib/auth"
import { useZohoEvents } from "@/hooks/use-zoho-events"

interface NeoBridgeHeaderProps {
  user: JWTPayload
}

const BREADCRUMBS: Record<string, string> = {
  "/neobridge/dashboard": "Dashboard",
  "/neobridge/kanban":    "Kanban",
  "/neobridge/agent":     "Agent Console",
  "/neobridge/sprint":    "Sprint Planner",
}

export function NeoBridgeHeader({ user }: NeoBridgeHeaderProps) {
  const pathname = usePathname()
  const { connected } = useZohoEvents()
  const page = BREADCRUMBS[pathname] ?? "NeoBridge"
  const initials = (user.email ?? "?").slice(0, 2).toUpperCase()

  return (
    <header className="sticky top-0 z-30 h-14 border-b bg-background flex items-center px-4 gap-4">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm">
        <Link href="/neobridge/dashboard" className="text-muted-foreground hover:text-foreground transition-colors">
          NeoBridge
        </Link>
        <span className="text-muted-foreground">/</span>
        <span className="font-medium">{page}</span>
      </div>

      {/* Live badge */}
      <div className="ml-auto flex items-center gap-2">
        <Badge
          variant={connected ? "default" : "secondary"}
          className="text-xs gap-1"
        >
          <span className={`h-1.5 w-1.5 rounded-full ${connected ? "bg-primary-foreground animate-pulse" : "bg-muted-foreground"}`} />
          {connected ? "Live" : "Offline"}
        </Badge>

        <ThemeToggle />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="rounded-full">
              <Avatar className="h-7 w-7">
                <AvatarFallback className="text-xs bg-primary text-primary-foreground">{initials}</AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <div className="px-2 py-1.5 text-xs text-muted-foreground">{user.email}</div>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild><Link href="/dashboard">My Dashboard</Link></DropdownMenuItem>
            <DropdownMenuItem asChild><Link href="/dashboard/profile">Profile</Link></DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild><Link href="/auth/logout">Sign out</Link></DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}

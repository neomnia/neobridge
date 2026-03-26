"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { LayoutDashboard, Kanban, Bot, Rocket, Settings, ChevronLeft, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { useState } from "react"

const NAV = [
  { href: "/neobridge/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/neobridge/kanban",    label: "Kanban",    icon: Kanban },
  { href: "/neobridge/agent",     label: "Agent",     icon: Bot },
  { href: "/neobridge/sprint",    label: "Sprint",    icon: Rocket },
]

export function NeoBridgeSidebar() {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)

  return (
    <TooltipProvider delayDuration={0}>
      <aside
        className={cn(
          "flex flex-col border-r bg-card transition-all duration-200",
          collapsed ? "w-14" : "w-56"
        )}
      >
        {/* Logo */}
        <div className={cn("flex items-center h-14 border-b px-3", collapsed ? "justify-center" : "gap-2")}>
          <div className="h-7 w-7 rounded-md bg-primary flex items-center justify-center flex-shrink-0">
            <span className="text-primary-foreground font-bold text-xs">NB</span>
          </div>
          {!collapsed && (
            <span className="font-semibold text-sm truncate">NeoBridge</span>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 py-2 space-y-0.5 px-2">
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(href + "/")
            const item = (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex items-center gap-2.5 rounded-md px-2 py-2 text-sm font-medium transition-colors",
                  "hover:bg-accent hover:text-accent-foreground",
                  active ? "bg-accent text-accent-foreground" : "text-muted-foreground",
                  collapsed && "justify-center px-0"
                )}
              >
                <Icon className="h-4 w-4 flex-shrink-0" />
                {!collapsed && <span>{label}</span>}
              </Link>
            )

            if (collapsed) {
              return (
                <Tooltip key={href}>
                  <TooltipTrigger asChild>{item}</TooltipTrigger>
                  <TooltipContent side="right">{label}</TooltipContent>
                </Tooltip>
              )
            }
            return item
          })}
        </nav>

        {/* Settings + collapse */}
        <div className="border-t p-2 space-y-0.5">
          {collapsed ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <Link href="/admin/settings" className="flex items-center justify-center rounded-md p-2 text-muted-foreground hover:bg-accent hover:text-accent-foreground">
                  <Settings className="h-4 w-4" />
                </Link>
              </TooltipTrigger>
              <TooltipContent side="right">Settings</TooltipContent>
            </Tooltip>
          ) : (
            <Link href="/admin/settings" className="flex items-center gap-2.5 rounded-md px-2 py-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground">
              <Settings className="h-4 w-4 flex-shrink-0" />
              <span>Settings</span>
            </Link>
          )}
          <Button
            variant="ghost"
            size="sm"
            className={cn("w-full text-muted-foreground", collapsed ? "px-0 justify-center" : "justify-start gap-2")}
            onClick={() => setCollapsed((c) => !c)}
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <><ChevronLeft className="h-4 w-4" /><span>Collapse</span></>}
          </Button>
        </div>
      </aside>
    </TooltipProvider>
  )
}

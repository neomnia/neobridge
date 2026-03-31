"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useEffect, useState } from "react"
import {
  Key,
  Users,
  LayoutDashboard,
  FolderOpen,
  FolderKanban,
  Layers,
  ScrollText,
  Settings,
  Server,
  Shield,
  Bot,
  BarChart3,
  DollarSign,
  ChevronRight,
  LogOut,
  PanelLeftClose,
  PanelLeft,
  ArrowLeft,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Separator } from "@/components/ui/separator"
import { toast } from "sonner"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type NavContext = "global" | "team" | "project"

interface NavItem {
  name: string
  href: string
  icon: React.ElementType
}

interface NavState {
  context: NavContext
  teamId: string | null
  projectId: string | null
}

// ---------------------------------------------------------------------------
// Route resolution
// ---------------------------------------------------------------------------

const RESERVED = new Set([
  "payments", "profile", "support", "admin", "company-management",
  "chat", "cart", "checkout", "appointments", "payment-methods",
  "new", "agent", "kanban", "sprint",
])

function resolveNav(pathname: string): NavState {
  // Project level: /dashboard/[teamId]/[projectId]/...
  const projectMatch = pathname.match(/^\/dashboard\/([^/]+)\/([^/]+)(?:\/|$)/)
  if (projectMatch) {
    const teamId = projectMatch[1]
    const projectId = projectMatch[2]
    if (!RESERVED.has(teamId) && !RESERVED.has(projectId)) {
      return { context: "project", teamId, projectId }
    }
  }

  // Team level: /dashboard/[teamId]
  const teamMatch = pathname.match(/^\/dashboard\/([^/]+)(?:\/|$)/)
  if (teamMatch && !RESERVED.has(teamMatch[1])) {
    return { context: "team", teamId: teamMatch[1], projectId: null }
  }

  return { context: "global", teamId: null, projectId: null }
}

// ---------------------------------------------------------------------------
// Nav item sets
// ---------------------------------------------------------------------------

const GLOBAL_ITEMS: NavItem[] = [
  { name: "Gestion de projets", href: "/dashboard/projects-pm", icon: FolderKanban },
  { name: "Déploiements",       href: "/dashboard/deployments", icon: Layers },
  { name: "Logs",               href: "/dashboard/logs",        icon: ScrollText },
  { name: "API Management",     href: "/admin/api",             icon: Key },
  { name: "Teams",              href: "/admin/teams",           icon: Users },
]

function teamItems(teamId: string): NavItem[] {
  return [
    { name: "Panoptique",    href: `/dashboard/${teamId}`,          icon: LayoutDashboard },
    { name: "Nouveau projet", href: `/dashboard/${teamId}/new`,     icon: FolderOpen },
    { name: "Paramètres",    href: `/dashboard/${teamId}/settings`, icon: Settings },
  ]
}

function projectItems(teamId: string, projectId: string): NavItem[] {
  const base = `/dashboard/${teamId}/${projectId}`
  return [
    { name: "Infrastructure", href: `${base}/infrastructure`, icon: Server },
    { name: "Gouvernance",    href: `${base}/governance`,     icon: Shield },
    { name: "Orchestration",  href: `${base}/orchestration`,  icon: Bot },
    { name: "Zoho",           href: `${base}/zoho`,           icon: BarChart3 },
    { name: "Coûts",          href: `${base}/costs`,          icon: DollarSign },
    { name: "Paramètres",     href: `${base}/settings`,       icon: Settings },
  ]
}

// ---------------------------------------------------------------------------
// Name resolution (client-side fetch, lightweight)
// ---------------------------------------------------------------------------

function useTeamName(teamId: string | null): string {
  if (!teamId) return ""
  // Slug → display name: "neomnia" → "Neomnia"
  return teamId.charAt(0).toUpperCase() + teamId.slice(1)
}

function useProjectName(projectId: string | null): string {
  const [name, setName] = useState<string>("")

  useEffect(() => {
    if (!projectId) { setName(""); return }
    fetch(`/api/projects/${projectId}`)
      .then((r) => r.ok ? r.json() : null)
      .then((d) => {
        const n: string | undefined = d?.data?.name ?? d?.name
        if (n) setName(n)
      })
      .catch(() => undefined)
  }, [projectId])

  return name || (projectId ? projectId.slice(0, 8) + "…" : "")
}

// ---------------------------------------------------------------------------
// Breadcrumb
// ---------------------------------------------------------------------------

interface BreadcrumbProps {
  context: NavContext
  teamId: string | null
  projectId: string | null
  teamName: string
  projectName: string
  collapsed: boolean
}

function SidebarBreadcrumb({ context, teamId, projectId, teamName, projectName, collapsed }: BreadcrumbProps) {
  if (collapsed) return null

  return (
    <div className="px-3 py-2 text-xs text-muted-foreground flex items-center gap-1 flex-wrap leading-relaxed">
      <Link href="/dashboard" className="hover:text-foreground transition-colors font-medium">
        NeoBridge
      </Link>
      {(context === "team" || context === "project") && teamId && (
        <>
          <ChevronRight className="h-3 w-3 shrink-0" />
          <Link
            href={`/dashboard/${teamId}`}
            className="hover:text-foreground transition-colors"
          >
            {teamName}
          </Link>
        </>
      )}
      {context === "project" && teamId && projectId && (
        <>
          <ChevronRight className="h-3 w-3 shrink-0" />
          <Link
            href={`/dashboard/${teamId}/${projectId}/infrastructure`}
            className="hover:text-foreground transition-colors"
          >
            {projectName}
          </Link>
        </>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Single nav link
// ---------------------------------------------------------------------------

function NavLink({
  item,
  active,
  collapsed,
  onClick,
}: {
  item: NavItem
  active: boolean
  collapsed: boolean
  onClick?: () => void
}) {
  const Icon = item.icon

  const link = (
    <Link
      href={item.href}
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
        collapsed && "justify-center px-2",
        active
          ? "bg-brand text-white"
          : "text-muted-foreground hover:bg-muted hover:text-foreground",
      )}
    >
      <Icon className="h-5 w-5 shrink-0" />
      {!collapsed && <span>{item.name}</span>}
    </Link>
  )

  if (collapsed) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{link}</TooltipTrigger>
        <TooltipContent side="right">{item.name}</TooltipContent>
      </Tooltip>
    )
  }

  return link
}

// ---------------------------------------------------------------------------
// Context label
// ---------------------------------------------------------------------------

const CONTEXT_LABEL: Record<NavContext, string> = {
  global:  "Global",
  team:    "Espace équipe",
  project: "Projet",
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

interface DynamicSidebarProps {
  isOpen?: boolean
  onClose?: () => void
}

export function DynamicSidebar({ isOpen = false, onClose }: DynamicSidebarProps) {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)

  const { context, teamId, projectId } = resolveNav(pathname)
  const teamName = useTeamName(teamId)
  const projectName = useProjectName(projectId)

  const items: NavItem[] =
    context === "project" && teamId && projectId
      ? projectItems(teamId, projectId)
      : context === "team" && teamId
        ? teamItems(teamId)
        : GLOBAL_ITEMS

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" })
    } catch {
      // ignore
    }
    localStorage.removeItem("user")
    localStorage.removeItem("authToken")
    toast.success("Déconnecté")
    window.location.href = "/auth/login"
  }

  return (
    <TooltipProvider delayDuration={0}>
      {isOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 md:hidden" onClick={onClose} />
      )}

      <aside
        className={cn(
          "fixed md:static inset-y-0 left-0 z-50 flex flex-col border-r bg-background transition-all duration-300",
          isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0",
          collapsed ? "w-[68px]" : "w-64",
        )}
      >
        {/* Logo */}
        <div className={cn(
          "flex h-16 items-center border-b shrink-0",
          collapsed ? "px-3 justify-center" : "px-4",
        )}>
          <Link href="/dashboard" className="flex items-center gap-2" onClick={onClose}>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand text-white font-bold text-sm shrink-0">
              NB
            </div>
            {!collapsed && (
              <span className="font-bold text-lg">
                <span className="text-foreground">Neo</span>
                <span className="text-brand">Bridge</span>
              </span>
            )}
          </Link>
        </div>

        {/* Breadcrumb */}
        <SidebarBreadcrumb
          context={context}
          teamId={teamId}
          projectId={projectId}
          teamName={teamName}
          projectName={projectName}
          collapsed={collapsed}
        />

        {!collapsed && (
          <div className="px-3 pb-1">
            <Separator />
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold mt-2 mb-1 px-1">
              {CONTEXT_LABEL[context]}
            </p>
          </div>
        )}

        {/* Nav */}
        <nav className={cn("flex-1 overflow-y-auto space-y-0.5", collapsed ? "p-2" : "px-3 pb-3")}>
          {items.map((item) => {
            const active =
              pathname === item.href ||
              (item.href !== "/dashboard" && pathname.startsWith(item.href + "/"))
            return (
              <NavLink
                key={item.href + item.name}
                item={item}
                active={active}
                collapsed={collapsed}
                onClick={onClose}
              />
            )
          })}
        </nav>

        {/* Footer */}
        <div className={cn("border-t shrink-0", collapsed ? "p-2 space-y-1" : "p-3 space-y-1")}>
          {/* Collapse toggle */}
          <Button
            variant="ghost"
            size={collapsed ? "icon" : "sm"}
            onClick={() => setCollapsed((c) => !c)}
            className={cn(
              "hidden md:flex text-muted-foreground hover:text-foreground",
              collapsed ? "w-full justify-center" : "w-full justify-start gap-2",
            )}
          >
            {collapsed ? (
              <PanelLeft className="h-5 w-5" />
            ) : (
              <>
                <PanelLeftClose className="h-5 w-5" />
                <span>Réduire</span>
              </>
            )}
          </Button>

          {/* Back to site */}
          {collapsed ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button asChild variant="ghost" size="icon" className="w-full text-muted-foreground">
                  <Link href="/" onClick={onClose}>
                    <ArrowLeft className="h-5 w-5" />
                  </Link>
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">Retour au site</TooltipContent>
            </Tooltip>
          ) : (
            <Button asChild variant="ghost" className="w-full justify-start gap-2 text-muted-foreground">
              <Link href="/" onClick={onClose}>
                <ArrowLeft className="h-5 w-5" />
                Retour au site
              </Link>
            </Button>
          )}

          {/* Logout */}
          {collapsed ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="w-full text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={handleLogout}
                >
                  <LogOut className="h-5 w-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">Déconnexion</TooltipContent>
            </Tooltip>
          ) : (
            <Button
              variant="ghost"
              className="w-full justify-start gap-2 text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={handleLogout}
            >
              <LogOut className="h-5 w-5" />
              Déconnexion
            </Button>
          )}
        </div>
      </aside>
    </TooltipProvider>
  )
}

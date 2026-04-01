"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Home,
  CreditCard,
  Building2,
  LogOut,
  User,
  Shield,
  Settings,
  Key,
  Mail,
  X,
  PanelLeftClose,
  PanelLeft,
  ArrowLeft,
  Users,
  FileText,
  ShoppingBag,
  CalendarDays,
  HelpCircle,
  Rocket,
  Headphones,
  Server,
  Bot,
  BarChart3,
  DollarSign,
  ChevronLeft,
  Terminal,
  Globe,
  MessageCircle,
  LayoutGrid,
  ScrollText,
  KanbanSquare,
  Search,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { useState } from "react"
import { ChevronDown } from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"
import { useUser } from "@/lib/contexts/user-context"
import { usePlatformConfig } from "@/contexts/platform-config-context"

const RESERVED = new Set(["payments", "profile", "support", "admin", "company-management", "chat", "cart", "checkout", "appointments", "payment-methods", "new", "projects", "deployments", "logs", "costs", "projects-pm", "api-keys", "kanban", "sprint", "agent"])

interface ActiveProject {
  teamId: string
  projectId: string
}

function getActiveProject(pathname: string): ActiveProject | null {
  const m = pathname.match(/^\/dashboard\/([^/]+)\/([^/]+)(?:\/|$)/)
  if (m && !RESERVED.has(m[1]) && !RESERVED.has(m[2])) {
    return { teamId: m[1], projectId: m[2] }
  }
  return null
}

function getTeamId(pathname: string): string | null {
  const m = pathname.match(/^\/dashboard\/([^/]+)(?:\/|$)/)
  if (m && !RESERVED.has(m[1])) return m[1]
  return null
}

const projectSubItems = [
  { name: "Infrastructure", href: "infrastructure", icon: Server        },
  { name: "Déploiements",   href: "deployments",   icon: Rocket        },
  { name: "Logs",           href: "logs",           icon: Terminal      },
  { name: "Domaines",       href: "domains",        icon: Globe         },
  { name: "Chat",           href: "chat",           icon: MessageCircle },
  { name: "Gouvernance",    href: "governance",     icon: Shield        },
  { name: "Orchestration",  href: "orchestration",  icon: Bot           },
  { name: "Zoho",           href: "zoho",           icon: BarChart3     },
  { name: "Coûts",          href: "costs",          icon: DollarSign    },
]

const globalNavItems = [
  { name: "Projets",        href: "/dashboard/projects",    icon: LayoutGrid    },
  { name: "Gestion PM",     href: "/dashboard/projects-pm", icon: KanbanSquare  },
  { name: "Déploiements",   href: "/dashboard/deployments", icon: Rocket        },
  { name: "Logs",           href: "/dashboard/logs",        icon: ScrollText    },
  { name: "Coûts",          href: "/dashboard/costs",       icon: DollarSign    },
  { name: "APIs NeoBridge", href: "/dashboard/api-keys",    icon: Key           },
]

const profileSubItems = [
  { name: "Mon profil",  href: "/dashboard/profile",            icon: User },
  { name: "Entreprise",  href: "/dashboard/company-management", icon: Building2 },
]

const adminItems = [
  { name: "Business",          href: "/admin",              icon: Rocket,       superAdminOnly: false },
  { name: "Appointments",      href: "/admin/appointments", icon: CalendarDays, superAdminOnly: false },
  { name: "Products",          href: "/admin/products",     icon: ShoppingBag,  superAdminOnly: false },
  { name: "Organization",      href: "/admin/users",        icon: Users,        superAdminOnly: true  },
  { name: "Parameters",        href: "/admin/settings",     icon: Settings,     superAdminOnly: false },
  { name: "API Management",    href: "/admin/api",          icon: Key,          superAdminOnly: false },
  { name: "Mail Management",   href: "/admin/mail",         icon: Mail,         superAdminOnly: false },
  { name: "Legal & Compliance",href: "/admin/legal",        icon: FileText,     superAdminOnly: false },
]

const supportSubItems = [
  { name: "Chat",    href: "/admin/chat"    },
  { name: "Tickets", href: "/admin/support" },
]

interface PrivateSidebarProps {
  isOpen?: boolean
  onClose?: () => void
}

export function PrivateSidebar({ isOpen = false, onClose }: PrivateSidebarProps) {
  const pathname = usePathname()
  const { isAdmin, isSuperAdmin, isLoading } = useUser()
  const { siteName, logo, logoDisplayMode } = usePlatformConfig()
  const activeProject = getActiveProject(pathname)
  const teamId = getTeamId(pathname)
  const [isProjectOpen, setIsProjectOpen] = useState(!!activeProject)
  const [isProfileOpen, setIsProfileOpen] = useState(
    pathname.startsWith("/dashboard/profile") || pathname.startsWith("/dashboard/company-management"),
  )
  const [isAdminOpen, setIsAdminOpen] = useState(
    pathname.startsWith("/admin") || pathname.startsWith("/dashboard/admin"),
  )
  const [isSupportOpen, setIsSupportOpen] = useState(
    pathname.startsWith("/admin/support") || pathname.startsWith("/admin/chat"),
  )
  const [isCollapsed, setIsCollapsed] = useState(false)

  const [adminSearch, setAdminSearch] = useState("")

  const logoInitials = siteName.substring(0, 2).toUpperCase()
  const visibleAdminItems = adminItems.filter(item => {
    if (item.superAdminOnly && !isSuperAdmin) return false
    if (!adminSearch) return true
    return item.name.toLowerCase().includes(adminSearch.toLowerCase())
  })

  const handleLinkClick = () => { if (onClose) onClose() }

  const handleLogout = async () => {
    try { await fetch("/api/auth/logout", { method: "POST" }) } catch (e) { console.error("Logout failed", e) }
    localStorage.removeItem("user")
    localStorage.removeItem("authToken")
    toast.success("Logged out successfully")
    window.location.href = "/auth/login"
  }

  // ── helpers ──────────────────────────────────────────────────────────────

  const navLink = (href: string, Icon: React.ElementType, label: string, exact = false) => {
    const isActive = exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`)
    if (isCollapsed) return (
      <Tooltip key={href}>
        <TooltipTrigger asChild>
          <Link href={href} onClick={handleLinkClick}
            className={cn("flex items-center justify-center rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              isActive ? "bg-brand text-white" : "text-muted-foreground hover:bg-muted hover:text-foreground")} >
            <Icon className="h-5 w-5" />
          </Link>
        </TooltipTrigger>
        <TooltipContent side="right">{label}</TooltipContent>
      </Tooltip>
    )
    return (
      <Link key={href} href={href} onClick={handleLinkClick}
        className={cn("flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
          isActive ? "bg-brand text-white" : "text-muted-foreground hover:bg-muted hover:text-foreground")} >
        <Icon className="h-5 w-5 flex-shrink-0" />
        {label}
      </Link>
    )
  }

  return (
    <TooltipProvider delayDuration={0}>
      {isOpen && <div className="fixed inset-0 bg-black/50 z-40 md:hidden" onClick={onClose} />}

      <aside className={cn(
        "fixed md:static inset-y-0 left-0 z-50 flex flex-col border-r bg-background transition-all duration-300",
        isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0",
        isCollapsed ? "w-[68px]" : "w-64",
      )}>

        {/* ── Logo ─────────────────────────────────────────────────────── */}
        <div className={cn("flex h-16 items-center border-b", isCollapsed ? "px-3 justify-center" : "px-6")}>
          <Link href="/dashboard" className="flex items-center gap-2" onClick={handleLinkClick}>
            {(isCollapsed || logoDisplayMode === 'logo' || logoDisplayMode === 'both') && (
              logo ? (
                <img src={logo} alt={siteName} className="h-8 w-8 object-contain" />
              ) : (
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand text-primary-foreground font-bold">
                  {logoInitials}
                </div>
              )
            )}
            {!isCollapsed && (logoDisplayMode === 'text' || logoDisplayMode === 'both') && (
              <span className="font-bold text-xl">
                <span className="text-foreground">{siteName.substring(0, 3)}</span>
                <span className="text-brand">{siteName.substring(3)}</span>
              </span>
            )}
          </Link>
          {isOpen && !isCollapsed && (
            <Button variant="ghost" size="icon" className="ml-auto md:hidden" onClick={onClose}>
              <X className="h-5 w-5" />
            </Button>
          )}
        </div>

        {/* ── Main nav — contextual by depth ───────────────────────────── */}
        <nav className={cn("flex-1 space-y-1 overflow-y-auto", isCollapsed ? "p-2" : "p-4")}>

          {activeProject ? (
            /* ── Project context ─────────────────────────────────────── */
            <>
              {/* Back to team overview */}
              {isCollapsed ? (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Link href="/dashboard/projects" onClick={handleLinkClick}
                      className="flex items-center justify-center rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
                      <ChevronLeft className="h-5 w-5" />
                    </Link>
                  </TooltipTrigger>
                  <TooltipContent side="right">Retour aux projets</TooltipContent>
                </Tooltip>
              ) : (
                <Link href="/dashboard/projects" onClick={handleLinkClick}
                  className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors mb-2">
                  <ChevronLeft className="h-4 w-4" />
                  Retour aux projets
                </Link>
              )}

              {/* Project sub-items */}
              {isCollapsed ? (
                <div className="space-y-1">
                  {projectSubItems.map(({ name, href, icon: Icon }) => {
                    const target = `/dashboard/${activeProject.teamId}/${activeProject.projectId}/${href}`
                    const isActive = pathname.startsWith(target)
                    return (
                      <Tooltip key={href}>
                        <TooltipTrigger asChild>
                          <Link href={target} onClick={handleLinkClick}
                            className={cn("flex items-center justify-center rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                              isActive ? "bg-brand text-white" : "text-muted-foreground hover:bg-muted hover:text-foreground")}>
                            <Icon className="h-5 w-5" />
                          </Link>
                        </TooltipTrigger>
                        <TooltipContent side="right">{name}</TooltipContent>
                      </Tooltip>
                    )
                  })}
                </div>
              ) : (
                <div className="space-y-1">
                  {projectSubItems.map(({ name, href, icon: Icon }) => {
                    const target = `/dashboard/${activeProject.teamId}/${activeProject.projectId}/${href}`
                    const isActive = pathname.startsWith(target)
                    return (
                      <Link key={href} href={target} onClick={handleLinkClick}
                        className={cn("flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                          isActive ? "bg-brand text-white" : "text-muted-foreground hover:bg-muted hover:text-foreground")}>
                        <Icon className="h-4 w-4" />
                        {name}
                      </Link>
                    )
                  })}
                </div>
              )}
            </>
          ) : (
            /* ── Global context ─────────────────────────────────────── */
            <>
              {navLink("/dashboard", Home, "Dashboard", true)}
              {isCollapsed ? (
                <div className="space-y-1 pt-1">
                  {globalNavItems.map(({ name, href, icon: Icon }) => {
                    const isActive = pathname === href || pathname.startsWith(`${href}/`)
                    return (
                      <Tooltip key={href}>
                        <TooltipTrigger asChild>
                          <Link href={href} onClick={handleLinkClick}
                            className={cn("flex items-center justify-center rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                              isActive ? "bg-brand text-white" : "text-muted-foreground hover:bg-muted hover:text-foreground")}>
                            <Icon className="h-5 w-5" />
                          </Link>
                        </TooltipTrigger>
                        <TooltipContent side="right">{name}</TooltipContent>
                      </Tooltip>
                    )
                  })}
                </div>
              ) : (
                <div className="space-y-1 pt-1">
                  {globalNavItems.map(({ name, href, icon: Icon }) => {
                    const isActive = pathname === href || pathname.startsWith(`${href}/`)
                    return (
                      <Link key={href} href={href} onClick={handleLinkClick}
                        className={cn("flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                          isActive ? "bg-brand text-white" : "text-muted-foreground hover:bg-muted hover:text-foreground")}>
                        <Icon className="h-5 w-5 flex-shrink-0" />
                        {name}
                      </Link>
                    )
                  })}
                </div>
              )}
            </>
          )}

          {/* ── Admin section (admins only, always visible) ─────────── */}
          {!isLoading && isAdmin && (
            <div className={cn(activeProject ? "pt-3 mt-3 border-t" : "pt-2 mt-2 border-t")}>
              {isCollapsed ? (
                <div className="space-y-1">
                  {visibleAdminItems.map(({ name, href, icon: Icon, superAdminOnly }) => {
                    if (superAdminOnly && !isSuperAdmin) return null
                    const isActive = href === "/admin" ? pathname === href : pathname.startsWith(href)
                    return (
                      <Tooltip key={href}>
                        <TooltipTrigger asChild>
                          <Link href={href} onClick={handleLinkClick}
                            className={cn("flex items-center justify-center rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                              isActive ? "bg-brand text-white" : "text-muted-foreground hover:bg-muted hover:text-foreground")}>
                            <Icon className="h-4 w-4" />
                          </Link>
                        </TooltipTrigger>
                        <TooltipContent side="right">{name}</TooltipContent>
                      </Tooltip>
                    )
                  })}
                </div>
              ) : (
                <Collapsible open={isAdminOpen} onOpenChange={setIsAdminOpen}>
                  <CollapsibleTrigger className="flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
                    <div className="flex items-center gap-3">
                      <Shield className="h-5 w-5" />
                      <span>Admin</span>
                    </div>
                    <ChevronDown className={cn("h-4 w-4 transition-transform", isAdminOpen && "rotate-180")} />
                  </CollapsibleTrigger>
                  <CollapsibleContent className="mt-1 space-y-1 pl-6">
                    {/* Recherche rapide admin */}
                    <div className="relative mb-1">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                      <Input
                        value={adminSearch}
                        onChange={e => setAdminSearch(e.target.value)}
                        placeholder="Rechercher…"
                        className="h-7 pl-7 pr-2 text-xs rounded-md"
                      />
                    </div>
                    <Link href="/admin" onClick={handleLinkClick}
                      className={cn("flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                        pathname === "/admin" ? "bg-brand text-white" : "text-muted-foreground hover:bg-muted hover:text-foreground")}>
                      <Rocket className="h-4 w-4" /> Business
                    </Link>
                    <Collapsible open={isSupportOpen} onOpenChange={setIsSupportOpen}>
                      <CollapsibleTrigger className={cn(
                        "flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                        (pathname.startsWith("/admin/support") || pathname.startsWith("/admin/chat"))
                          ? "bg-brand/10 text-brand" : "text-muted-foreground hover:bg-muted hover:text-foreground")}>
                        <div className="flex items-center gap-3">
                          <Headphones className="h-4 w-4" /><span>Support</span>
                        </div>
                        <ChevronDown className={cn("h-4 w-4 transition-transform", isSupportOpen && "rotate-180")} />
                      </CollapsibleTrigger>
                      <CollapsibleContent className="mt-1 space-y-1 pl-7">
                        {supportSubItems.map(({ name, href }) => (
                          <Link key={href} href={href} onClick={handleLinkClick}
                            className={cn("flex items-center rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                              (pathname === href || pathname.startsWith(`${href}/`)) ? "bg-brand text-white" : "text-muted-foreground hover:bg-muted hover:text-foreground")}>
                            {name}
                          </Link>
                        ))}
                      </CollapsibleContent>
                    </Collapsible>
                    {visibleAdminItems.filter(i => i.href !== "/admin").map(({ name, href, icon: Icon }) => {
                      const isActive = pathname === href || pathname.startsWith(`${href}/`)
                      return (
                        <Link key={href} href={href} onClick={handleLinkClick}
                          className={cn("flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                            isActive ? "bg-brand text-white" : "text-muted-foreground hover:bg-muted hover:text-foreground")}>
                          <Icon className="h-4 w-4" />{name}
                        </Link>
                      )
                    })}
                  </CollapsibleContent>
                </Collapsible>
              )}
            </div>
          )}
        </nav>

        {/* ── Bottom zone — user management + system ───────────────────── */}
        <div className={cn("border-t", isCollapsed ? "p-2 space-y-1" : "p-4 space-y-1")}>

          {/* User items */}
          {isCollapsed ? (
            <>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Link href="/dashboard/payments" onClick={handleLinkClick}
                    className={cn("flex items-center justify-center rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                      pathname.startsWith("/dashboard/payments") ? "bg-brand text-white" : "text-muted-foreground hover:bg-muted hover:text-foreground")}>
                    <CreditCard className="h-5 w-5" />
                  </Link>
                </TooltipTrigger>
                <TooltipContent side="right">Payments</TooltipContent>
              </Tooltip>
              {profileSubItems.map(({ name, href, icon: Icon }) => (
                <Tooltip key={href}>
                  <TooltipTrigger asChild>
                    <Link href={href} onClick={handleLinkClick}
                      className={cn("flex items-center justify-center rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                        (pathname === href || pathname.startsWith(`${href}/`)) ? "bg-brand text-white" : "text-muted-foreground hover:bg-muted hover:text-foreground")}>
                      <Icon className="h-5 w-5" />
                    </Link>
                  </TooltipTrigger>
                  <TooltipContent side="right">{name}</TooltipContent>
                </Tooltip>
              ))}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Link href="/dashboard/support" onClick={handleLinkClick}
                    className={cn("flex items-center justify-center rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                      pathname.startsWith("/dashboard/support") ? "bg-brand text-white" : "text-muted-foreground hover:bg-muted hover:text-foreground")}>
                    <HelpCircle className="h-5 w-5" />
                  </Link>
                </TooltipTrigger>
                <TooltipContent side="right">Support</TooltipContent>
              </Tooltip>
            </>
          ) : (
            <>
              <Link href="/dashboard/payments" onClick={handleLinkClick}
                className={cn("flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  pathname.startsWith("/dashboard/payments") ? "bg-brand text-white" : "text-muted-foreground hover:bg-muted hover:text-foreground")}>
                <CreditCard className="h-5 w-5" /> Payments
              </Link>

              <Collapsible open={isProfileOpen} onOpenChange={setIsProfileOpen}>
                <CollapsibleTrigger className={cn(
                  "flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  (pathname.startsWith("/dashboard/profile") || pathname.startsWith("/dashboard/company-management"))
                    ? "bg-brand/10 text-brand" : "text-muted-foreground hover:bg-muted hover:text-foreground")}>
                  <div className="flex items-center gap-3">
                    <User className="h-5 w-5" /><span>Profil</span>
                  </div>
                  <ChevronDown className={cn("h-4 w-4 transition-transform shrink-0", isProfileOpen && "rotate-180")} />
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-1 space-y-1 pl-6">
                  {profileSubItems.map(({ name, href, icon: Icon }) => (
                    <Link key={href} href={href} onClick={handleLinkClick}
                      className={cn("flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                        (pathname === href || pathname.startsWith(`${href}/`)) ? "bg-brand text-white" : "text-muted-foreground hover:bg-muted hover:text-foreground")}>
                      <Icon className="h-4 w-4" />{name}
                    </Link>
                  ))}
                </CollapsibleContent>
              </Collapsible>

              <Link href="/dashboard/support" onClick={handleLinkClick}
                className={cn("flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  pathname.startsWith("/dashboard/support") ? "bg-brand text-white" : "text-muted-foreground hover:bg-muted hover:text-foreground")}>
                <HelpCircle className="h-5 w-5" /> Support
              </Link>
            </>
          )}

          {/* System actions */}
          <div className={cn("pt-2 mt-1 border-t space-y-1")}>
            <Button variant="ghost" size={isCollapsed ? "icon" : "sm"}
              onClick={() => setIsCollapsed(!isCollapsed)}
              className={cn("hidden md:flex text-muted-foreground hover:text-foreground",
                isCollapsed ? "w-full justify-center" : "w-full justify-start")}>
              {isCollapsed ? <PanelLeft className="h-5 w-5" /> : <><PanelLeftClose className="h-5 w-5 mr-2" /><span>Réduire</span></>}
            </Button>

            {isCollapsed ? (
              <>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button asChild variant="ghost" size="icon" className="w-full text-muted-foreground hover:text-foreground">
                      <Link href="/" onClick={handleLinkClick}><ArrowLeft className="h-5 w-5" /></Link>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="right">Accueil</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" className="w-full text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950" onClick={handleLogout}>
                      <LogOut className="h-5 w-5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="right">Déconnexion</TooltipContent>
                </Tooltip>
              </>
            ) : (
              <>
                <Button asChild variant="ghost" className="w-full justify-start text-muted-foreground hover:text-foreground">
                  <Link href="/" className="flex items-center gap-3" onClick={handleLinkClick}>
                    <ArrowLeft className="h-5 w-5" />Accueil
                  </Link>
                </Button>
                <Button variant="ghost" className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950" onClick={handleLogout}>
                  <LogOut className="h-5 w-5 mr-3" />Déconnexion
                </Button>
              </>
            )}
          </div>
        </div>
      </aside>
    </TooltipProvider>
  )
}

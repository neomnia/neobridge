"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { ChevronRight, Home } from "lucide-react"
import { cn } from "@/lib/utils"

// ── Libellés lisibles pour chaque segment d'URL ──────────────────────────────

const LABELS: Record<string, string> = {
  // Racines
  dashboard:    "Dashboard",
  admin:        "Admin",

  // Dashboard global
  "projects-pm":  "Gestion PM",
  "api-keys":     "APIs NeoBridge",
  deployments:    "Déploiements",
  logs:           "Logs",
  costs:          "Coûts",
  projects:       "Projets",
  kanban:         "Kanban",
  sprint:         "Sprint",
  agent:          "Agent",
  profile:        "Profil",
  payments:       "Paiements",
  support:        "Support",
  chat:           "Chat",
  cart:           "Panier",
  checkout:       "Checkout",
  appointments:   "Rendez-vous",
  "payment-methods": "Moyens de paiement",
  "company-management": "Entreprise",

  // Zones projet
  infrastructure: "Infrastructure",
  governance:     "Gouvernance",
  orchestration:  "Orchestration",
  zoho:           "Zoho",
  settings:       "Paramètres",
  new:            "Nouveau",
  domains:        "Domaines",

  // Admin
  users:          "Utilisateurs",
  products:       "Produits",
  orders:         "Commandes",
  api:            "API Management",
  mail:           "Email",
  legal:          "Légal",
  teams:          "Teams",
  "vat-rates":    "Taux TVA",
  "api-management": "API Management",
}

// Segments qui désignent un identifiant dynamique (UUID, slug)
// On les rend lisibles plutôt que d'afficher le UUID brut
const UUID_RE = /^[0-9a-f-]{8,}$/i

function labelFor(segment: string): string {
  if (LABELS[segment]) return LABELS[segment]
  if (UUID_RE.test(segment)) return segment.slice(0, 8) + "…"
  // Capitalise les slugs non connus
  return segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, " ")
}

// ── Composant ─────────────────────────────────────────────────────────────────

export function PrivateBreadcrumb() {
  const pathname = usePathname()

  // Ne pas afficher sur la racine dashboard ou admin
  if (pathname === "/dashboard" || pathname === "/admin") return null

  const segments = pathname.split("/").filter(Boolean)
  // Construit les chemins cumulés : ["dashboard", "dashboard/teams", ...]
  const crumbs = segments.map((seg, i) => ({
    label: labelFor(seg),
    href:  "/" + segments.slice(0, i + 1).join("/"),
    isLast: i === segments.length - 1,
  }))

  return (
    <nav
      aria-label="Fil d'Ariane"
      className="flex items-center gap-1 px-6 py-2 text-xs text-muted-foreground border-b bg-background/60 backdrop-blur-sm"
    >
      <Link href="/dashboard" className="hover:text-foreground transition-colors">
        <Home className="h-3.5 w-3.5" />
      </Link>

      {crumbs.map((crumb) => (
        <span key={crumb.href} className="flex items-center gap-1">
          <ChevronRight className="h-3 w-3 shrink-0 opacity-50" />
          {crumb.isLast ? (
            <span className={cn("font-medium", "text-foreground")}>
              {crumb.label}
            </span>
          ) : (
            <Link
              href={crumb.href}
              className="hover:text-foreground transition-colors"
            >
              {crumb.label}
            </Link>
          )}
        </span>
      ))}
    </nav>
  )
}

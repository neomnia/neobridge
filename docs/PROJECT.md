# NeoSaaS — Developer Reference

## Table of Contents

1. [Overview](#overview)
2. [Tech Stack](#tech-stack)
3. [Project Structure](#project-structure)
4. [Architecture](#architecture)
5. [Database Schema](#database-schema)
6. [Getting Started](#getting-started)
7. [Available Scripts](#available-scripts)

---

## Overview

NeoSaaS is a full-stack multi-tenant SaaS boilerplate built with Next.js 15 App Router. It provides a production-ready foundation covering user management, e-commerce, appointment booking, customer support, Stripe payments, and a complete admin panel.

---

## Tech Stack

| Category | Technology |
|---|---|
| Framework | Next.js 15 (App Router) + React 19 |
| Language | TypeScript 5.7 |
| Database | PostgreSQL (Drizzle ORM) |
| UI | Tailwind CSS 3.4 + shadcn/ui (Radix UI) |
| Auth | JWT + OAuth (Google, GitHub, Microsoft, Facebook) |
| Payments | Stripe + Lago |
| Email | Multi-provider (Scaleway TEM, AWS SES, Resend) |
| Package manager | pnpm |
| Deployment | Vercel / Docker |
| E2E Testing | Cypress |

---

## Project Structure

```
Neosaas-app/
│
├── app/                          # Next.js App Router
│   ├── (auth)/                   # Public auth routes
│   │   ├── login/
│   │   ├── register/
│   │   ├── recover-password/
│   │   ├── reset-password/
│   │   ├── verify/
│   │   └── accept-invite/
│   │
│   ├── (errors)/                 # Error pages
│   │   ├── 404/ 500/ 503/
│   │   ├── maintenance/
│   │   └── success/
│   │
│   ├── (private)/                # Protected routes (auth required)
│   │   ├── admin/                # Admin dashboard
│   │   │   ├── appointments/     # Appointment management
│   │   │   ├── products/         # Product catalog
│   │   │   ├── users/            # User management
│   │   │   ├── orders/           # Orders
│   │   │   ├── coupons/          # Discount codes
│   │   │   ├── invoices/         # Invoices
│   │   │   ├── mail/             # Email configuration
│   │   │   ├── chat/             # Support chat (admin)
│   │   │   ├── support/          # Support tickets
│   │   │   ├── api-management/   # API keys
│   │   │   ├── settings/         # Platform settings
│   │   │   ├── vat-rates/        # VAT rates
│   │   │   └── legal/            # Legal compliance
│   │   │
│   │   ├── dashboard/            # Client dashboard
│   │   │   ├── appointments/     # Client appointments
│   │   │   ├── checkout/         # Checkout flow
│   │   │   ├── checkout-lago/    # Lago checkout
│   │   │   ├── cart/             # Shopping cart
│   │   │   ├── chat/             # Support chat (client)
│   │   │   ├── company-management/
│   │   │   ├── profile/
│   │   │   ├── payment-methods/
│   │   │   ├── payments/
│   │   │   └── support/
│   │   │
│   │   └── onboarding/
│   │
│   ├── (public)/                 # Public pages
│   │   ├── book/[productId]/     # Appointment booking
│   │   ├── brand/
│   │   ├── configuration/        # Initial setup
│   │   ├── demo/
│   │   ├── docs/
│   │   ├── features/
│   │   ├── pricing/
│   │   ├── legal/
│   │   └── store/
│   │
│   ├── api/                      # REST API routes
│   │   ├── admin/                # Admin-only endpoints
│   │   │   ├── appointments/
│   │   │   ├── chat/
│   │   │   ├── email-templates/
│   │   │   ├── notifications/
│   │   │   ├── oauth/
│   │   │   ├── stripe/
│   │   │   ├── users/
│   │   │   ├── vat-rates/
│   │   │   └── payments/
│   │   │
│   │   ├── auth/                 # Authentication
│   │   │   ├── login/ logout/ register/
│   │   │   ├── me/
│   │   │   ├── oauth/
│   │   │   └── onboarding/
│   │   │
│   │   ├── appointments/         # Appointments (client)
│   │   │   ├── route.ts          # GET / POST
│   │   │   └── [id]/route.ts     # GET / PUT / DELETE
│   │   │
│   │   ├── checkout/
│   │   │   └── available-slots/
│   │   ├── chat/
│   │   ├── email/
│   │   ├── stripe/               # Stripe webhooks
│   │   ├── products/
│   │   ├── orders/
│   │   ├── services/
│   │   ├── llm/
│   │   └── health/
│   │
│   ├── actions/                  # Next.js Server Actions
│   │   ├── appointments.ts
│   │   ├── auth.ts
│   │   ├── ecommerce.ts
│   │   ├── payments.ts
│   │   ├── coupons.ts
│   │   └── admin-dashboard.ts
│   │
│   ├── layout.tsx
│   └── page.tsx
│
├── components/
│   ├── ui/                       # Base components (shadcn/ui)
│   ├── admin/                    # Admin-specific components
│   ├── layout/                   # Layout components
│   │   ├── dashboard/            # Admin dashboard header/sidebar
│   │   └── private-dashboard/    # Client dashboard header/sidebar
│   ├── checkout/                 # Checkout components
│   ├── chat/                     # Chat widget
│   ├── legal/                    # Cookie consent, ToS modal
│   └── common/                   # Shared utilities
│
├── lib/                          # Business logic & utilities
│   ├── auth/                     # Auth helpers (server-side)
│   │   ├── server.ts             # verifyAuth(), isAdmin()
│   │   └── admin-auth.ts
│   ├── auth.ts                   # getCurrentUser()
│   ├── oauth/                    # OAuth providers
│   ├── email/                    # Email router & providers
│   ├── checkout/                 # Checkout logic
│   ├── notifications/            # Admin & appointment notifications
│   ├── services/                 # Third-party service abstraction
│   ├── data/                     # Read-only data layer
│   ├── theme/                    # Theme CSS generation
│   ├── stripe-*.ts               # Stripe helpers
│   ├── config.ts
│   └── utils.ts
│
├── db/
│   ├── schema.ts                 # Drizzle schema (source of truth)
│   ├── index.ts                  # DB connection
│   └── migrate.ts
│
├── drizzle/                      # Generated SQL migration files
│   ├── 0000_oval_iron_man.sql
│   ├── 0001_stripe_product_sync.sql
│   ├── 0002_stripe_unification.sql
│   └── meta/_journal.json
│
├── scripts/                      # Admin & build scripts
├── contexts/                     # Global React contexts
├── hooks/                        # Custom React hooks
├── types/                        # Global TypeScript types
├── public/                       # Static assets
├── styles/                       # Global CSS
├── cypress/                      # E2E tests
│
├── vercel.json
├── drizzle.config.ts
├── next.config.mjs
├── tailwind.config.ts
└── .env.example
```

---

## Architecture

### Route Groups (Next.js App Router)

| Group | Purpose |
|---|---|
| `(auth)` | Auth pages, no protected layout |
| `(private)` | Requires valid session |
| `(public)` | Accessible without login |
| `(errors)` | Error pages |

### Data Flow

```
React Component
  ↓  Server Action or fetch()
Auth check (verifyAuth / getCurrentUser)
  ↓
Business logic (lib/)
  ↓
Drizzle ORM → PostgreSQL
  ↓
JSON response → state update
```

### Authentication

- Custom JWT (no NextAuth) via `jose`
- HttpOnly cookie sessions
- Social OAuth: Google, GitHub, Microsoft, Facebook
- RBAC with two scopes: `platform` (global admin) and `company` (tenant admin)
- Platform admins: `companyId = null` — Clients: `companyId` required

### Multi-tenancy

- `companies` table isolates tenants
- All user data, products, orders, and payments are scoped to a `companyId`
- Dual permission level: platform-wide and company-scoped

### Email

- `emailRouter` in `lib/email/index.ts` routes to the active provider
- Provider config stored encrypted in the database — switchable from the admin UI without redeployment

### Payments

- **Stripe**: one-time payments, subscriptions, webhooks
- **Lago**: usage-based billing (optional)
- Payment methods stored per company (PCI compliant — no sensitive card data in DB)

---

## Database Schema

### Main Tables

| Table | Description |
|---|---|
| `companies` | Tenant organizations |
| `subscriptions` | Stripe subscriptions per company |
| `payment_methods` | Stripe cards per company |
| `users` | Users (clients + admins) |
| `roles` | RBAC roles |
| `permissions` | Permissions per role |
| `user_roles` | User ↔ role mapping |
| `role_permissions` | Role ↔ permission mapping |
| `oauth_connections` | OAuth tokens per user |
| `products` | Products (physical, digital, appointment) |
| `orders` | Orders |
| `order_items` | Order line items |
| `coupons` | Discount codes |
| `coupon_usage` | Coupon usage tracking |
| `carts` | Shopping carts |
| `cart_items` | Cart items |
| `appointments` | Appointments (client ↔ admin) |
| `appointment_slots` | Availability slots |
| `appointment_exceptions` | Exceptions (blocked dates, vacations) |
| `chat_conversations` | Support conversations |
| `chat_messages` | Chat messages |
| `chat_quick_responses` | Admin quick replies |
| `email_provider_configs` | Email provider config (encrypted) |
| `email_templates` | Email templates |
| `email_send_history` | Send history |
| `service_api_configs` | Third-party service config (encrypted) |
| `user_api_keys` | User API keys |
| `llm_api_keys` | LLM API keys |
| `llm_usage_logs` | LLM usage tracking |
| `vat_rates` | VAT rates |
| `platform_config` | Platform settings (key/value) |
| `page_permissions` | Page access control |
| `tos_versions` | Terms of service versions |
| `user_tos_acceptances` | ToS acceptance records |
| `cookie_consents` | Cookie consent records |
| `system_logs` | System logs |

### Migrations

Migration files are generated by `drizzle-kit` into `drizzle/`. The migration journal is at `drizzle/meta/_journal.json`.

```bash
pnpm db:generate   # Generate a new migration file from schema changes
pnpm db:migrate    # Apply pending migrations
pnpm db:push       # Direct schema sync (development only)
pnpm db:studio     # Open Drizzle Studio (visual DB browser)
```

---

## Getting Started

### Prerequisites

- Node.js 20+
- pnpm
- A PostgreSQL database (Neon recommended)
- A Stripe account

### Setup

```bash
# Install dependencies
pnpm install

# Copy environment template
cp .env.example .env.local
# Fill in DATABASE_URL, JWT_SECRET, Stripe keys, etc.

# Push schema to database
pnpm db:push

# Seed base data (roles, permissions, VAT, platform config)
pnpm db:seed-base

# Seed email templates
pnpm seed:email-templates

# Start development server
pnpm dev
```

Open `http://localhost:3000`. For the initial admin account, navigate to `/configuration`.

---

## Available Scripts

```bash
# Development
pnpm dev                   # Start Next.js dev server

# Build
pnpm build                 # Production build (with DB migrations)
pnpm build:local           # Production build (without migrations)
pnpm start                 # Start production server

# Database
pnpm db:generate           # Generate migration file from schema
pnpm db:migrate            # Apply pending migrations
pnpm db:push               # Sync schema directly to DB (dev)
pnpm db:ensure             # Verify/add critical columns
pnpm db:verify             # Check schema vs DB consistency
pnpm db:reset              # Reset database (dev only)
pnpm db:seed               # Full seed with demo data
pnpm db:seed-base          # Seed roles, permissions, VAT, config
pnpm db:studio             # Open Drizzle Studio

# Seeding
pnpm seed:email-templates  # Seed email templates
pnpm seed:pages            # Sync page permissions

# Quality
pnpm check:email-config    # Verify email configuration
pnpm lint                  # Run ESLint
```

---

## Versioning Model

NeoSaaS now follows **Semantic Versioning (SemVer)**: `MAJOR.MINOR.PATCH`.

### Version rules

- `MAJOR`: incompatible API or behavior changes.
- `MINOR`: backward-compatible features.
- `PATCH`: backward-compatible fixes.

### Suffixes (pre-release)

- `-alpha.N`: early internal iteration.
- `-beta.N`: feature-complete but still in stabilization.
- `-rc.N`: release candidate before stable publication.

Examples:

- `1.2.0`
- `1.3.0-beta.2`
- `2.0.0-rc.1`

### Release workflow

1. Update the target version in release notes/status docs.
2. Ensure changelog entries include impacted files and user/developer impact.
3. Tag the release with `vMAJOR.MINOR.PATCH` (for example `v1.1.0`).
4. Publish and keep `main` aligned with the released state.

### Changelog categories

Use these prefixes in release notes and status updates:

- `Added`
- `Changed`
- `Fixed`
- `Removed`
- `Security`

## Navigation — Structure du Sidebar

Le sidebar s'adapte selon le contexte de navigation. Il y a **deux sidebars** distincts :

```
┌──────────────────────────────────────────────────────────────────┐
│  SIDEBAR PRINCIPAL  (PrivateSidebar)                             │
│  Toutes les routes privées (/dashboard/* et /admin/*)            │
│  Composant : components/layout/private-dashboard/sidebar.tsx     │
└──────────────────────────────────────────────────────────────────┘
```

### Sidebar — Niveau utilisateur (toujours visible)

```
┌─────────────────────────────────┐
│  [Logo]  NeoSaaS / NeoBridge    │
├─────────────────────────────────┤
│                                 │
│  🏠  Projets        /dashboard  │
│                                 │
│  💳  Payments   /dashboard/...  │
│                                 │
│  👤  Profil         ▼ (ouvre)   │  ← Collapsible
│    ↳ Mon profil  /dashboard/    │
│      profile                    │
│    ↳ Entreprise  /dashboard/    │  ← company-management
│      company-management         │
│                                 │
│  ❓  Support    /dashboard/     │
│      support                    │
│                                 │
├─────────────────────────────────┤  ← visible si projet actif
│  📦  Projet actif   ▼ (ouvre)   │  (ex: /dashboard/team/proj/...)
│    ↳ Infrastructure             │
│    ↳ Gouvernance                │
│    ↳ Orchestration              │
│    ↳ Zoho                       │
│    ↳ Coûts                      │
│    ↳ Paramètres                 │
├─────────────────────────────────┤  ← visible si isAdmin
│  🛡  Admin          ▼ (ouvre)   │
│    ↳ Business       /admin      │
│    ↳ Support ▼                  │
│       ↳ Chat                    │
│       ↳ Tickets                 │
│    ↳ Appointments               │
│    ↳ Products                   │
│    ↳ Organization               │  (super admin only)
│    ↳ Parameters                 │
│    ↳ API Management             │
│    ↳ Mail Management            │
│    ↳ Legal & Compliance         │
├─────────────────────────────────┤
│  [ Réduire ]                    │
│  [ Retour au site ]             │
│  [ Déconnexion ]                │
└─────────────────────────────────┘
```

### Sidebar — Niveau NeoBridge projet (DynamicSidebar)

```
┌──────────────────────────────────────────────────────────────────┐
│  DYNAMIC SIDEBAR  (composant autonome, non branché au layout)    │
│  Composant : components/neobridge/layout/DynamicSidebar.tsx      │
│  Usage futur : déploiement NeoBridge standalone                  │
└──────────────────────────────────────────────────────────────────┘

  Niveau GLOBAL   → /dashboard
  ┌─────────────────────────────────┐
  │  NeoB Bridge                    │
  │  NeoBridge >                    │  ← breadcrumb
  ├─────────────────────────────────┤
  │  🔑  API Management  /admin/api │
  │  👥  Teams        /admin/teams  │
  └─────────────────────────────────┘

  Niveau TEAM     → /dashboard/[teamId]
  ┌─────────────────────────────────┐
  │  NeoBridge > Neomnia            │  ← breadcrumb
  ├─────────────────────────────────┤
  │  🏠  Panoptique                 │
  │  📁  Projets                    │
  │  ⚙️  Paramètres                 │
  └─────────────────────────────────┘

  Niveau PROJET   → /dashboard/[teamId]/[projectId]
  ┌─────────────────────────────────┐
  │  NeoBridge > Neomnia > Proj     │  ← breadcrumb
  ├─────────────────────────────────┤
  │  🖥  Infrastructure             │
  │  🛡  Gouvernance                │
  │  🤖  Orchestration              │
  │  📊  Zoho                       │
  │  💰  Coûts                      │
  │  ⚙️  Paramètres                 │
  └─────────────────────────────────┘
```

### Routes NeoBridge — Architecture complète

```
app/(private)/
│
├── dashboard/                        # Root → redirect vers team si 1 seule team
│   │
│   ├── payments/                     # Historique paiements client
│   ├── profile/                      # Profil utilisateur
│   ├── company-management/           # Paramètres entreprise cliente (sous Profil)
│   ├── support/                      # Help Center + FAQ + Live Chat
│   ├── chat/                         # Chat client ↔ support
│   ├── appointments/                 # Rendez-vous
│   ├── payment-methods/              # Moyens de paiement
│   │
│   ├── [teamId]/                     # Workspace team (slug ex: "neomnia")
│   │   ├── layout.tsx                # Passthrough pur
│   │   ├── page.tsx                  # Liste des projets de la team
│   │   │
│   │   └── [projectId]/             # Projet (UUID Zoho ou DB)
│   │       ├── layout.tsx            # Header projet (nom + badge statut)
│   │       ├── page.tsx              # Redirect → /infrastructure
│   │       ├── infrastructure/       # Ressources déployées (ResourceCard)
│   │       ├── governance/           # Règles d'automatisation
│   │       ├── orchestration/        # Temporal + Agent IA
│   │       ├── zoho/                 # Intégration Zoho Projects
│   │       ├── costs/                # Coûts (à créer)
│   │       └── settings/             # Connecteurs externes
│
└── admin/                            # Admin dashboard (isAdmin requis)
    ├── page.tsx                      # Business overview
    ├── appointments/
    ├── products/
    ├── users/
    ├── orders/
    ├── coupons/
    ├── invoices/
    ├── mail/
    ├── chat/
    ├── support/
    ├── api/                          # API Management
    ├── api-management/
    ├── settings/
    ├── vat-rates/
    ├── legal/
    └── teams/
```

### Base de données — Tables NeoBridge

```
teams                    Workspaces clients (slug unique)
  └── team_members       Membres + rôles (owner | writer | reader)
  └── api_credentials    Tokens services externes par team
  └── projects           Projets rattachés à la team
       └── project_connectors  Connecteurs (Vercel, Zoho, GitHub...)
       └── project_resources   Ressources déployées (remplace project_apps)
                               Unique: (projectId, provider, name)
                               Champs: provider, resourceType, url,
                                       status, externalResourceId
```

### Connecteurs externes — lib/connectors/

```
lib/connectors/
└── vercel.ts
    ├── syncVercelTeams(adminToken)              → GET /v2/teams
    ├── listVercelProjects(vercelTeamId, token)  → GET /v9/projects
    ├── deleteVercelProject(projectId, ...)      → DELETE /v9/projects/[id]
    └── listVercelDeployments(...)               → GET /v6/deployments
```

### API Routes NeoBridge

```
/api/projects/[id]/resources
  GET    → liste project_resources du projet
  POST   → upsert (onConflictDoUpdate sur projectId+provider+name)
  DELETE → supprime + option deleteOnVercel (appelle Vercel API)

/api/projects/[id]/apps      → legacy, pointe encore sur project_apps
/api/projects/[id]/connectors
/api/projects/[id]/
/api/teams/[teamId]/
/api/teams/[teamId]/members/
/api/teams/[teamId]/credentials/
```

---

## Changelog

### [2026-03-29]

- **NeoBridge DynamicSidebar** : composant 3 niveaux (`components/neobridge/layout/DynamicSidebar.tsx`). Non branché au layout principal (réservé à un déploiement standalone futur).
- **PrivateSidebar enrichi** : sous-menu Profil avec "Mon profil" et "Entreprise" (company-management). Ajout de "Coûts" dans les sous-items projet.
- **Tabs supprimés** : navigation par onglets retirée de `[projectId]/layout.tsx`. Routes distinctes uniquement.
- **project_resources** : migration Drizzle de `project_apps` → `project_resources` avec colonnes `provider`, `resourceType`, `url`, `status`. Contrainte unique `(projectId, provider, name)`.
- **lib/connectors/vercel.ts** : connecteur Vercel (syncTeams, listProjects, deleteProject, listDeployments).
- **ResourceCard** : modal de suppression avec case "Supprimer aussi sur Vercel" décochée par défaut.
- **Files modified**: `docs/PROJECT.md`, `db/schema.ts`, `app/(private)/layout-client.tsx`, `components/layout/private-dashboard/sidebar.tsx`, `app/(private)/dashboard/[teamId]/[projectId]/layout.tsx`

### [2026-03-23]

- **Added versioning model**: SemVer policy, pre-release conventions, and release workflow added.
- **Files modified**: `docs/PROJECT.md`
- **Impact**: Standardized release cadence and clearer version communication.

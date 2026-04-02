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
| Payments | Stripe Direct (legacy Lago references still being cleaned up) |
| Email | Multi-provider (Scaleway TEM, AWS SES, Resend) |
| Package manager | pnpm |
| Deployment | Vercel / Docker / Railway |
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

- **Stripe Direct**: one-time payments, subscriptions, invoices, and webhooks
- Legacy `Lago` references may still appear in historical docs or deprecated routes, but the active billing path is Stripe-only
- Payment methods stored per company (PCI compliant — no sensitive card data in DB)

### NeoBridge Navigation & Resource Model (April 2026)

- **Primary navigation**: the sidebar is the single entry point. Project pages should no longer expose local tab bars.
- **Route hierarchy**:
  - `/dashboard` → global scope
  - `/dashboard/[teamId]` → team scope
  - `/dashboard/[teamId]/[projectId]/<section>` → project scope
- **Project submenu visibility**: the dynamic project menu appears only when the current pathname contains an active project context (`/dashboard/[teamId]/[projectId]/...`). On a pure team page like `/dashboard/neomnia`, the contextual submenu is intentionally absent.
- **Empty state behavior**: `app/(private)/dashboard/[teamId]/page.tsx` renders `0 projets` / `Aucun projet disponible` whenever `listTeamProjects(teamId)` returns no rows. In production mode, the data layer returns an empty list if no NeoBridge projects are stored and no Zoho connector is mapped.
- **Project sections** currently map to `infrastructure`, `governance`, `orchestration`, `zoho`, and `settings`.
- **Vercel linkage is optional**: a NeoBridge project may exist without any Vercel resource attached.
- **Source of truth**: NeoBridge stays authoritative for project lifecycle. If a NeoBridge project is deleted, any linked Vercel project deletion must be an explicit, confirmed cascade action.
- **Current schema note**: `project_apps` already stores attached deployment units; if the model expands beyond apps/connectors, the recommended semantic rename is `project_resources`.
- **Known investigation**: repeated `500` errors on project/Zoho routes are most likely tied to shared loading in `app/(private)/dashboard/[teamId]/[projectId]/layout.tsx`, `lib/zoho-data.ts`, and `lib/zoho.ts`, especially when Zoho credentials or `ZOHO_PORTAL_ID` are incomplete or when the NeoBridge project is not actually mapped to a Zoho project.

### Temporal Orchestration (NeoBridge)

- Temporal endpoints are available under `app/api/temporal/*`.
- `TEMPORAL_ADDRESS` and `TEMPORAL_NAMESPACE` are required to target a running Temporal cluster.
- `TEMPORAL_API_KEY` is optional and used as a Bearer token when Temporal is exposed behind an authenticated gateway.
- For Railway setup, refer to `docs/deployment/RAILWAY_TEMPORAL.md`.

### MongoDB Learning Store

- MongoDB is intended for NeoBridge training/knowledge data only.
- Temporal persistence and visibility must use a supported backend (PostgreSQL/MySQL/other Temporal-supported stores), not MongoDB.

### Temporal backlog verified from Notion (April 2026)

After cross-checking the main `NeoBridge` page and its `Temporal — Backend Durable Execution` subpage with the current repository state:

- **Already present in repo**: `app/api/temporal/start/route.ts`, `app/api/temporal/cancel/route.ts`, `app/api/temporal/active/route.ts`, `app/api/temporal/status/[id]/route.ts`, plus UI hooks/components that call these endpoints.
- **Now scaffolded in repo**: `@temporalio/*` dependencies are declared and a dedicated `temporal/` worker directory now exists (`workflows`, `activities`, `worker.ts`).
- **Still to verify operationally**: the end-to-end Railway deployment, service health, and real worker execution against the hosted Temporal cluster.
- **Operational implication**: the app now has a concrete LangChain-to-Temporal integration path in code, but the live Railway deployment still needs validation with a working token/access path.

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

## Changelog

### [2026-04-02]
- **Loading states & skeleton pour tout le dashboard**: ajout de `loading.tsx` avec skeletons adaptes pour `/dashboard`, `/dashboard/api-keys`, `/dashboard/deployments`, `/dashboard/github`, `/dashboard/projects-pm` et `/dashboard/costs`. Fini les pages blanches pendant le chargement.
- **Test de connexion par service API**: nouveau composant `ServiceTestButton` client-side qui appelle `POST /api/services/[service]/test` et affiche spinner/succes/echec en temps reel.
- **Zoho test reel**: le test Zoho echange maintenant le refresh token via OAuth et verifie le portal ID au lieu de juste valider le format.
- **Section onboarding Zoho**: guide pas-a-pas affiche sur la page API keys quand Zoho n'est pas configure (admin uniquement).
- **Documentation SYNC_RULES.md**: nouveau document decrivant les regles de synchronisation, loading states, resolution de credentials, test par service et configuration Zoho.
- **Fichiers modifies**: `app/(private)/dashboard/loading.tsx`, `app/(private)/dashboard/api-keys/loading.tsx`, `app/(private)/dashboard/deployments/loading.tsx`, `app/(private)/dashboard/github/loading.tsx`, `app/(private)/dashboard/projects-pm/loading.tsx`, `app/(private)/dashboard/costs/loading.tsx`, `app/(private)/dashboard/api-keys/page.tsx`, `app/(private)/dashboard/api-keys/service-test-button.tsx`, `app/api/services/[service]/test/route.ts`, `docs/SYNC_RULES.md`
- **Impact**: l'UX de chargement est fluide (skeleton au lieu de page blanche), chaque service peut etre teste individuellement depuis la page API keys, et Zoho dispose d'un guide d'onboarding et d'un test de connexion reel.

### [2026-04-02]
- **Service sync connection fix**: the cockpit and service clients now read the saved NeoBridge credentials from both `service_api_configs` and the legacy admin keys store, and Zoho is no longer blocked by env-only detection.
- **Files modified**: `lib/vercel/client.ts`, `lib/github/client.ts`, `lib/railway/client.ts`, `lib/zoho.ts`, `lib/zoho-data.ts`, `app/(private)/dashboard/api-keys/page.tsx`, `app/(private)/dashboard/page.tsx`
- **Impact**: configured services can now surface real synchronization state in the cockpit instead of staying invisible when the keys already exist in the admin configuration.

### [2026-04-02]
- **GitHub layer added to the global cockpit**: introduced a dedicated `/dashboard/github` page, added recent Git pushes/updates to `/dashboard`, exposed GitHub coverage in the production cockpit, and surfaced GitHub linkage in the global PM view.
- **Files modified**: `lib/github/client.ts`, `app/(private)/dashboard/github/page.tsx`, `app/(private)/dashboard/page.tsx`, `app/(private)/dashboard/projects-pm/page.tsx`, `components/layout/private-dashboard/sidebar.tsx`
- **Impact**: NeoBridge now centralizes repository visibility alongside Vercel/Railway/Zoho and highlights which Git repositories are already tied to a NeoBridge master project.

### [2026-04-02]
- **Branch diagnostic for project visibility**: compared `synchrozoho`, `correction-erreurs`, and `claude/reconnect-zoho-integration-ESxWW`; the empty `/dashboard/[teamId]` screen matches the older `synchrozoho` flow, while the richer dynamic module menu is present on the newer branches and only activates for an active project route.
- **Files referenced**: `app/(private)/dashboard/[teamId]/page.tsx`, `components/layout/private-dashboard/sidebar.tsx`, `lib/zoho-data.ts`, `docs/PROJECT.md`
- **Impact**: the current screenshot is now explained: without synced NeoBridge projects / Zoho mapping / project route context, the UI stays on the team-level empty state and does not expose the project submenu.

### [2026-04-02]
- **Infrastructure UX cleanup**: removed product-specific hardcoded copy from the project infrastructure screen, replaced placeholder actions with real navigation to settings, aligned server-side loading with the shared data layer instead of an internal self-fetch, and removed the duplicated local tab bar from the project layout so navigation stays sidebar-first.
- **Files modified**: `app/(private)/dashboard/[teamId]/[projectId]/infrastructure/page.tsx`, `app/(private)/dashboard/[teamId]/[projectId]/layout.tsx`, `docs/PROJECT.md`
- **Impact**: the project shell stays closer to the NeoBridge UX/layout rules, with fewer misleading non-functional controls, cleaner infrastructure wording, and no redundant in-page navigation.

### [2026-04-02]
- **NeoBridge navigation and Vercel sync clarified**: documented the official global/team/project routing model, the dynamic sidebar direction, the optional nature of Vercel linkage, and the current investigation path for repeated Zoho-related `500` errors.
- **Files referenced**: `app/(private)/dashboard/[teamId]/[projectId]/layout.tsx`, `components/layout/private-dashboard/sidebar.tsx`, `lib/zoho-data.ts`, `lib/zoho.ts`, `docs/deployment/VERCEL.md`
- **Impact**: the product frame is now aligned for the next implementation pass and the production incident triage is better scoped.

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

## Changelog

### [2026-04-02 — Railway project management + LangChain context]

- **Railway pilotable depuis NeoBridge**: ajout d'un client GraphQL Railway et de routes API pour lire, mettre à jour et enrichir un projet Railway (projet, services, variables) directement depuis NeoBridge.
- **LangChain enrichi avec le contexte Railway**: le brief agent inclut maintenant les services et environnements Railway disponibles pour préparer les workflows Temporal avec plus de contexte d'infra.
- **Files modified**: `lib/railway/client.ts`, `app/api/railway/projects/route.ts`, `app/api/railway/projects/[projectId]/route.ts`, `app/api/railway/projects/[projectId]/services/route.ts`, `app/api/railway/projects/[projectId]/variables/route.ts`, `lib/agents/langchain.ts`, `app/api/agent/route.ts`, `docs/deployment/RAILWAY_TEMPORAL.md`
- **Impact**: NeoBridge dispose maintenant d'une base concrète pour créer/lire/éditer l'environnement Railway du projet et pour l'exposer aux agents LangChain.

### [2026-04-02 — Railway project-token support]

- **Support Railway project token ajouté**: les vérifications NeoBridge utilisent désormais automatiquement l'en-tête `Project-Access-Token` pour les tokens projet Railway scoppés à un environnement.
- **Files modified**: `app/api/services/[service]/test/route.ts`, `lib/services/initializers.ts`, `app/(private)/admin/api/page.tsx`, `lib/services/types.ts`, `docs/deployment/RAILWAY_TEMPORAL.md`
- **Impact**: NeoBridge peut se connecter au projet `neobridge` avec un token projet dédié, sans dépendre d'un token de compte global.

### [2026-04-02 — Railway OAuth callback]

- **Railway OAuth bootstrap ajouté**: nouvelle paire de routes `/api/auth/oauth/railway` + `/api/auth/oauth/railway/callback`, avec persistance du token dans `service_api_configs` après consentement.
- **Files modified**: `app/api/auth/oauth/railway/route.ts`, `app/api/auth/oauth/railway/callback/route.ts`, `lib/railway/oauth.ts`, `app/(private)/admin/api/page.tsx`, `app/api/services/[service]/test/route.ts`, `lib/services/initializers.ts`, `docs/deployment/RAILWAY_TEMPORAL.md`
- **Impact**: NeoBridge peut maintenant utiliser le flux OAuth Railway officiel au lieu de dépendre uniquement d'un token manuel.

### [2026-04-02 — LangChain gateway]

- **LangChain interface scaffolded for Railway/Temporal**: added a server-side agent endpoint that prepares a LangChain brief, stores traces in Mongo when configured, and then hands execution off to the Temporal start API.
- **Files modified**: `app/api/agent/route.ts`, `lib/agents/langchain.ts`, `hooks/use-agent-session.ts`, `components/neobridge/kanban/KanbanBoard.tsx`, `components/neobridge/sprint/SprintPlanner.tsx`, `temporal/worker.ts`, `temporal/workflows/*`, `temporal/activities/index.ts`, `Dockerfile.temporal-worker`, `package.json`, `docs/deployment/RAILWAY_TEMPORAL.md`
- **Impact**: NeoBridge now has a concrete integration point for LangChain in front of Railway-hosted Temporal workflows.

### [2026-04-02 — Notion alignment]

- **Notion checklist aligned with repo state**: verified the official `NeoBridge` and `Temporal` Notion pages against the codebase and documented the remaining Temporal implementation gap.
- **Files modified**: `docs/PROJECT.md`, `docs/deployment/RAILWAY_TEMPORAL.md`
- **Impact**: clearer view of what is already implemented versus what still needs delivery or validation.

### [2026-04-02 — Deployment hygiene]

- **Deployment secrets hygiene improved**: removed hardcoded Neon/Railway values from helper scripts and aligned setup flows around environment-provided secrets.
- **Files modified**: `scripts/check-user-direct.ts`, `scripts/quick-check-user.js`, `scripts/setup-vercel-env.sh`, `scripts/vercel-api-setup.sh`, `docs/deployment/RAILWAY_TEMPORAL.md`, `STATUS.md`
- **Impact**: safer onboarding, Vercel configuration, and Railway runbooks with less risk of leaking credentials in the repo.

### [2026-03-23]

- **Added versioning model**: SemVer policy, pre-release conventions, and release workflow added.
- **Files modified**: `docs/PROJECT.md`
- **Impact**: Standardized release cadence and clearer version communication.

### [2026-03-29]

- **Railway + Temporal documentation update**: Added Railway deployment guidance for Temporal Server, Temporal UI, PostgreSQL, and MongoDB usage boundaries.
- **Files modified**: `docs/PROJECT.md`, `docs/deployment/RAILWAY_TEMPORAL.md`
- **Impact**: Clear deployment blueprint for NeoBridge orchestration and agent-learning data separation.

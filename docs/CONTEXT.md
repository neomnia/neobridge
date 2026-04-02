# CONTEXT.md — La Boussole

> Lire ce fichier **en premier** avant toute tâche de développement.

---

## Vision

**NeoBridge** est un orchestrateur de services IA (RAG) entre MongoDB et SharePoint.

Il s'appuie sur une base SaaS multi-tenant (NeoSaaS) pour piloter, configurer et monitorer des pipelines de traitement documentaire : ingestion depuis des sources (Notion, SharePoint), traitement par LLM (Claude API), et restitution vers des cibles (SharePoint, API tierces).

---

## Stack Technique

| Couche | Technologie | Rôle |
|--------|-------------|------|
| **Pilot / Frontend** | Vercel + Next.js 15 (App Router) | Interface admin, dashboard, API routes |
| **Auth / Logs** | Neon PostgreSQL + Drizzle ORM | Authentification JWT, logs système, config plateforme |
| **Knowledge** | MongoDB | Service-Mapping, configurations IA, base de connaissances RAG |
| **Workers** | Railway | Jobs asynchrones, pipelines RAG, tâches longues |
| **LLM** | Claude API (Anthropic) | Extraction, résumé, embedding, RAG |
| **UI** | Tailwind CSS + shadcn/ui | Composants interface |
| **Email** | Resend / Scaleway TEM / AWS SES | Notifications transactionnelles |
| **Paiements** | Stripe | Abonnements et facturation |

---

## Règle d'Or

> **Ne jamais coder en dur un ID, une clé API ou un endpoint.**
>
> Toute configuration de service (API key, endpoint, status) doit transiter par le **Service-Mapping stocké dans MongoDB**, accessible via `lib/services/repository.ts`.

---

## Principes Fondamentaux

1. **Configuration 100% base de données** — aucun secret métier dans le code ou `.env` (sauf les credentials d'infrastructure indispensables).
2. **TypeScript strict** — tout nouveau type dans `@/types` ou `@/lib/services/types.ts`.
3. **Un service = un contrat** — voir `ARCHITECTURE.md` pour la définition d'un service "Actif".
4. **Logs avant abandon** — en cas d'erreur de connexion, logger et stopper. Ne pas réécrire la logique.
5. **Vérifier `git status` avant chaque tâche** — ne jamais commencer sur un arbre de travail sale.

---

## Points d'Entrée Clés

| Quoi | Où |
|------|----|
| Types globaux | `types/index.ts` |
| Types services | `lib/services/types.ts` |
| Repository services | `lib/services/repository.ts` |
| Routes API services | `app/api/services/` |
| Routes API LLM | `app/api/llm/` |
| Actions serveur | `app/actions/` |
| Schéma DB (Neon) | `db/schema.ts` |
| Config Drizzle | `drizzle.config.ts` |

---

## Ce que NeoBridge N'Est Pas

- Ce n'est pas un simple CRUD — c'est un orchestrateur de flux.
- Ce n'est pas un projet monolithique figé — les services sont déclarés dynamiquement via le Service-Mapping.
- Ce n'est pas un projet sans types — tout est TypeScript strict.

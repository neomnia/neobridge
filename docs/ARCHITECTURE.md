# ARCHITECTURE.md — La Carte

---

## Schéma des Flux Principaux

```
┌─────────────┐     ┌───────────┐     ┌─────────────┐     ┌─────────────┐
│   Notion /  │────▶│  MongoDB  │────▶│ Claude API  │────▶│ SharePoint  │
│  SharePoint │     │(Knowledge)│     │  (RAG/LLM)  │     │  / Targets  │
└─────────────┘     └───────────┘     └─────────────┘     └─────────────┘
       │                  │                  │
       │                  ▼                  │
       │          ┌───────────────┐          │
       │          │ Service-      │          │
       └─────────▶│ Mapping       │◀─────────┘
                  │ (config,      │
                  │  routing,     │
                  │  status)      │
                  └───────┬───────┘
                          │
                  ┌───────▼───────┐
                  │   Workers     │
                  │  (Railway)    │
                  │  pipelines    │
                  └───────────────┘
```

**Flux détaillé :**

1. **Ingestion** — Une source (Notion, SharePoint) pousse ou expose des documents.
2. **Mapping** — MongoDB résout quel service/pipeline traite ces documents (Service-Mapping).
3. **Traitement LLM** — Claude API (via `app/api/llm/`) génère embeddings, résumés, extractions.
4. **Restitution** — Le résultat est écrit vers la cible configurée (SharePoint, API tierce, DB).
5. **Logs** — Chaque étape écrit dans Neon (`system_logs`) via les Server Actions.

---

## Définition d'un "Service Actif"

Un service est considéré **Actif** dans le Service-Mapping s'il remplit tous les champs obligatoires suivants :

| Champ | Type | Description |
|-------|------|-------------|
| `serviceName` | `ServiceName` | Identifiant unique du service (`'anthropic'`, `'notion'`, `'railway'`, …) |
| `serviceType` | `ServiceType` | Catégorie : `'neobridge'`, `'compute'`, `'payment'`, `'email'`, … |
| `environment` | `ServiceEnvironment` | `'production'` \| `'test'` \| `'sandbox'` |
| `isActive` | `boolean` | **Doit être `true`** — sinon le service est ignoré par l'orchestrateur |
| `isDefault` | `boolean` | Marque le service par défaut pour son type |
| `config.api_key` | `string` | Clé API chiffrée (AES-256-GCM) |
| `config.endpoint` | `string` | URL de l'endpoint du service |

> **Un service sans `isActive: true` est invisible pour les pipelines.**
> Toujours vérifier via `serviceApiRepository.listConfigs()` avant d'appeler un service externe.

Les types sont définis dans `lib/services/types.ts` — `ServiceName`, `ServiceType`, `ServiceEnvironment`, `BaseServiceConfig`.

---

## Structure du Projet

```
neobridge/
│
├── app/                          # Next.js App Router
│   ├── (auth)/                   # Routes publiques (login, register, OAuth)
│   ├── (errors)/                 # Pages d'erreur (404, 500, 503)
│   ├── (private)/                # Routes protégées (auth requise)
│   │   ├── admin/                # Dashboard admin
│   │   │   ├── api-management/   # Gestion des services API (Service-Mapping)
│   │   │   ├── settings/         # Configuration plateforme
│   │   │   └── users/            # Gestion utilisateurs
│   │   └── dashboard/            # Dashboard client
│   ├── actions/                  # Server Actions Next.js
│   └── api/                      # API Routes
│       ├── services/             # CRUD Service-Mapping
│       ├── llm/                  # Endpoints LLM (Claude API)
│       ├── auth/                 # Authentification + OAuth
│       └── stripe/               # Webhooks Stripe
│
├── components/
│   ├── admin/                    # Composants dashboard admin
│   ├── neobridge/                # Composants spécifiques NeoBridge
│   └── ui/                       # Composants shadcn/ui (ne pas modifier)
│
├── lib/
│   ├── services/                 # Orchestration des services
│   │   ├── types.ts              # Types TypeScript des services
│   │   ├── repository.ts         # Accès DB aux configs de services
│   │   ├── initializers.ts       # Initialisation des clients de services
│   │   └── index.ts              # Exports centralisés
│   ├── connectors/               # Connecteurs externes (GitHub, Vercel)
│   ├── auth/                     # Logique d'authentification
│   ├── data/                     # Requêtes DB (Neon/Drizzle)
│   └── utils.ts                  # Utilitaires généraux
│
├── types/
│   ├── index.ts                  # Types globaux partagés
│   ├── theme-config.ts           # Types configuration thème
│   └── chart.ts                  # Types graphiques
│
├── db/
│   └── schema.ts                 # Schéma Drizzle ORM (Neon PostgreSQL)
│
├── drizzle/                      # Migrations SQL
├── scripts/                      # Scripts de build et maintenance
├── docs/                         # Documentation projet (ce dossier)
└── public/                       # Assets statiques
```

---

## Emplacement des Fichiers Clés

| Fichier | Rôle |
|---------|------|
| `lib/services/types.ts` | Tous les types de services (ServiceName, ServiceConfig, etc.) |
| `lib/services/repository.ts` | Lecture/écriture des configs dans la DB |
| `db/schema.ts` | Schéma complet Neon (tables, relations, types Drizzle) |
| `app/api/services/route.ts` | `GET /api/services` — liste les services actifs |
| `app/api/llm/route.ts` | Endpoint principal LLM (Claude API) |
| `app/actions/` | Toutes les Server Actions (auth, admin, ecommerce, payments) |
| `types/index.ts` | Types globaux applicatifs |
| `.env.example` | Template des variables d'environnement (ne jamais committer `.env`) |

---

## Flux d'Authentification

```
Client ──▶ POST /api/auth/login ──▶ JWT (httpOnly cookie)
                                       │
                              ┌────────▼────────┐
                              │  getCurrentUser  │
                              │  (server-side)   │
                              └────────┬─────────┘
                                       │
                         ┌─────────────▼──────────────┐
                         │  Route protégée / Action    │
                         │  (vérif. role si nécessaire)│
                         └─────────────────────────────┘
```

OAuth social (GitHub, Google) : configuré 100% via Admin → API Manager (table `service_api_configs`), sans variables d'environnement.

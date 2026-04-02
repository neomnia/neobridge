# Temporal + Temporal UI sur Railway (NeoBridge)

> Objectif: rendre Temporal fonctionnel dans Railway avec les dependances necessaires.

## Vue d'ensemble

Pour ton besoin NeoBridge (agents specialises + entrainement sur sujet), il faut separer les roles:

- Temporal Server: orchestration des workflows
- Temporal UI: interface UX de Temporal
- PostgreSQL: persistence requise par Temporal (obligatoire)
- MongoDB: stockage applicatif IA/apprentissage NeoBridge (separe de Temporal)

Important: MongoDB n'est pas le moteur de persistence de Temporal. Temporal utilise SQL (PostgreSQL/MySQL) ou autres stores supportes pour sa persistence/visibility.

## Architecture recommandee Railway

1. Service `temporal-db` (PostgreSQL plugin Railway)
2. Service `temporal` (image `temporalio/auto-setup:1.30.2`)
3. Service `temporal-ui` (image `temporalio/ui:2.39.0`)
4. Service `neobridge-mongo` (MongoDB plugin Railway)
5. Service `neobridge-app` (cette app Next.js)

## Etape 1 - Connexion Railway avec ta cle API

Ne commite jamais la cle API dans le repo.

```bash
export RAILWAY_TOKEN="<token-railway-stocke-dans-ton-shell-ou-ton-gestionnaire-de-secrets>"
railway login --token "$RAILWAY_TOKEN"
```

> Recommandation: conserver les tokens Railway/Vercel uniquement dans les variables d'environnement locales ou dans le gestionnaire de secrets de l'équipe, jamais en clair dans le repo ou Notion.

Puis:

```bash
railway link
```

## Etape 2 - Provisionner PostgreSQL pour Temporal

Dans Railway:

1. New Service -> Database -> PostgreSQL
2. Nom du service: `temporal-db`
3. Recuperer les variables internes de connexion

Variables attendues cote Temporal:

- `POSTGRES_SEEDS`: host interne PostgreSQL
- `DB_PORT`: 5432
- `POSTGRES_USER`
- `POSTGRES_PWD`
- `POSTGRES_DB`

## Etape 3 - Deployer Temporal Server

Creer un service image Docker:

- Image: `temporalio/auto-setup:1.30.2`
- Nom: `temporal`

Variables d'environnement du service `temporal`:

```env
DB=postgres12
DB_PORT=5432
POSTGRES_SEEDS=${{temporal-db.RAILWAY_PRIVATE_DOMAIN}}
POSTGRES_USER=${{temporal-db.PGUSER}}
POSTGRES_PWD=${{temporal-db.PGPASSWORD}}
POSTGRES_DB=${{temporal-db.PGDATABASE}}
DYNAMIC_CONFIG_FILE_PATH=config/dynamicconfig/development-sql.yaml
ENABLE_ES=false
```

Expose le port `7233`.

## Etape 4 - Deployer Temporal UI (extension UX)

Creer un service image Docker:

- Image: `temporalio/ui:2.39.0`
- Nom: `temporal-ui`

Variables d'environnement du service `temporal-ui`:

```env
TEMPORAL_ADDRESS=temporal:7233
TEMPORAL_CORS_ORIGINS=https://<ton-domaine-app>
```

Expose le port `8080` (ou route HTTP Railway par defaut).

## Etape 5 - Ajouter MongoDB pour l'apprentissage applicatif

Dans Railway:

1. New Service -> Database -> MongoDB
2. Nom: `neobridge-mongo`
3. Recuperer `MONGO_URL` / `MONGODB_URI`

Cette base est pour tes donnees d'apprentissage/agents. Elle ne remplace pas PostgreSQL de Temporal.

## Etape 6 - Configurer NeoBridge

Dans le service `neobridge-app`, ajouter:

```env
TEMPORAL_ADDRESS=http://temporal:7233
TEMPORAL_NAMESPACE=default
# Optionnel si endpoint protege par gateway
TEMPORAL_API_KEY=

# Base SQL de l'application NeoBridge (deja existante)
DATABASE_URL=...

# Base Mongo dediee a l'apprentissage
MONGODB_URI=${{neobridge-mongo.MONGO_URL}}
```

## Etape 6bis - Ajouter LangChain pour interfacer NeoBridge + Temporal + Mongo

Conformement a la documentation Railway consultee le 2 avril 2026:

- utiliser des **Service Variables** ou **Shared Variables** pour les secrets communs,
- reutiliser les **Reference Variables** (`${{shared.KEY}}`, `${{SERVICE.VAR}}`),
- privilegier le **Private Networking** via `temporal.railway.internal:7233` ou le domaine prive Railway du service,
- si le worker vit dans un sous-dossier ou un Dockerfile dedie, definir `RAILWAY_DOCKERFILE_PATH`.

Variables recommandees pour le service NeoBridge ou un futur worker dedie:

```env
TEMPORAL_ADDRESS=http://temporal.railway.internal:7233
TEMPORAL_NAMESPACE=default
MONGODB_URI=${{neobridge-mongo.MONGO_URL}}
LANGCHAIN_DEFAULT_PROVIDER=anthropic
LANGCHAIN_DEFAULT_MODEL=claude-3-5-sonnet-latest
ANTHROPIC_API_KEY=${{shared.ANTHROPIC_API_KEY}}
MISTRAL_API_KEY=${{shared.MISTRAL_API_KEY}}
```

Etat repo verifie:

- `app/api/agent/route.ts` construit maintenant un **brief LangChain** puis delegue le lancement a `app/api/temporal/start/route.ts`.
- `lib/agents/langchain.ts` choisit Anthropic ou Mistral selon les credentials resolves et journalise la session dans Mongo quand `MONGODB_URI` est disponible.
- Les composants UI (`AgentConsole`, `KanbanBoard`, `SprintPlanner`) peuvent donc passer par une interface agent unique sans parler directement au worker Railway.

## Etape 7 - Verification rapide

Depuis NeoBridge (ou local):

```bash
curl -X POST https://<ton-app>/api/temporal/start \
  -H "Content-Type: application/json" \
  -H "Cookie: <session-auth>" \
  -d '{"workflow":"agentSessionWorkflow","mode":"single"}'
```

Puis verifier le statut:

```bash
curl https://<ton-app>/api/temporal/active -H "Cookie: <session-auth>"
```

## Etat actuel verifie dans ce repo (2026-04-02)

- ✅ Les routes `app/api/temporal/*` existent et parlent a l'endpoint HTTP Temporal quand `TEMPORAL_ADDRESS` est configure.
- ✅ Les composants UI (`KanbanBoard`, `SprintPlanner`, `use-agent-session`) savent declencher les workflows `agentSessionWorkflow` et `sprintPlanningWorkflow`.
- ✅ Un scaffold applicatif `temporal/` est maintenant present avec `workflows`, `activities` et `worker.ts`.
- ✅ Les dependances `@temporalio/*`, `langchain` et `mongodb` sont declarees dans `package.json` pour preparer le worker Railway.
- ⚠️ Le deploiement Railway n'a pas encore pu etre verifie depuis cette session car le token CLI fourni renvoie `Unauthorized`.

## Fichiers lies dans ce repo

- `docker-compose.temporal.yml`: stack locale de reference (Temporal + UI + PostgreSQL + MongoDB)
- `app/api/temporal/start/route.ts`: demarrage workflow (support `TEMPORAL_API_KEY`)
- `app/api/temporal/cancel/route.ts`: annulation workflow (support `TEMPORAL_API_KEY`)
- `app/api/temporal/status/[id]/route.ts`: statut workflow (support `TEMPORAL_API_KEY`)
- `app/api/temporal/active/route.ts`: listing workflows actifs
- `app/api/agent/route.ts`: passerelle LangChain → Temporal pour les sessions agent
- `lib/agents/langchain.ts`: preparation du brief IA + persistence Mongo
- `temporal/worker.ts`: worker Temporal Node a deployer sur Railway
- `temporal/workflows/*`: workflows `agentSessionWorkflow`, `sprintPlanningWorkflow`, `ciAutoFixWorkflow`
- `Dockerfile.temporal-worker`: image dediee pour un service worker Railway via `RAILWAY_DOCKERFILE_PATH`

## Changelog

### [2026-04-02 — Worker scaffold]

- **LangChain + Temporal worker scaffold** : ajout d'une passerelle `app/api/agent`, d'un scaffold `temporal/` et d'un Dockerfile dedie pour preparer le worker Railway avec Mongo.
- **Fichiers modifies** : `app/api/agent/route.ts`, `lib/agents/langchain.ts`, `temporal/worker.ts`, `temporal/workflows/*`, `temporal/activities/index.ts`, `Dockerfile.temporal-worker`, `package.json`, `docs/deployment/RAILWAY_TEMPORAL.md`
- **Impact** : integration concrete NeoBridge ↔ LangChain ↔ Temporal prete pour un deploiement Railway des que l'acces CLI/API est valide.

### [2026-04-02 — Secrets hygiene]

- **Sanitisation des credentials d'infra** : remplacement des tokens explicites par des placeholders et rappel d'usage via variables d'environnement locales/secrets manager.
- **Fichiers modifies** : `docs/deployment/RAILWAY_TEMPORAL.md`, `scripts/setup-vercel-env.sh`, `scripts/vercel-api-setup.sh`
- **Impact** : runbook Railway/Vercel plus sûr et plus conforme aux bonnes pratiques d'équipe.

### [2026-03-29]

- **Preparation Railway Temporal + UX** : ajout d'un runbook de deploiement Railway avec SQL + Mongo
- **Fichiers modifies** : `docs/deployment/RAILWAY_TEMPORAL.md`, `docker-compose.temporal.yml`
- **Impact** : stack deploiement claire pour rendre Temporal operationnel sur Railway

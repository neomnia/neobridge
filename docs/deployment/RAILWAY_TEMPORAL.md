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
export RAILWAY_TOKEN="bd603b15-8f73-483c-89dd-965810628fa1"
railway login --token "$RAILWAY_TOKEN"
```

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

## Fichiers lies dans ce repo

- `docker-compose.temporal.yml`: stack locale de reference (Temporal + UI + PostgreSQL + MongoDB)
- `app/api/temporal/start/route.ts`: demarrage workflow (support `TEMPORAL_API_KEY`)
- `app/api/temporal/cancel/route.ts`: annulation workflow (support `TEMPORAL_API_KEY`)
- `app/api/temporal/status/[id]/route.ts`: statut workflow (support `TEMPORAL_API_KEY`)
- `app/api/temporal/active/route.ts`: listing workflows actifs

## Changelog

### [2026-03-29]

- **Preparation Railway Temporal + UX** : ajout d'un runbook de deploiement Railway avec SQL + Mongo
- **Fichiers modifies** : `docs/deployment/RAILWAY_TEMPORAL.md`, `docker-compose.temporal.yml`
- **Impact** : stack deploiement claire pour rendre Temporal operationnel sur Railway

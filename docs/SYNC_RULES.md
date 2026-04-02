# NeoBridge — Regles de Synchronisation Services

> Ce document decrit les conventions UX et techniques pour l'affichage de synchronisation dans le cockpit NeoBridge.

---

## 1. Loading States (etats de chargement)

### Regle absolue : zero page blanche

Chaque route dashboard **DOIT** avoir un fichier `loading.tsx` qui affiche un skeleton adapte au layout final de la page. Next.js App Router utilise ce fichier comme fallback pendant le rendu serveur.

### Fichiers loading existants

| Route | Fichier |
|---|---|
| `/dashboard` | `app/(private)/dashboard/loading.tsx` |
| `/dashboard/api-keys` | `app/(private)/dashboard/api-keys/loading.tsx` |
| `/dashboard/deployments` | `app/(private)/dashboard/deployments/loading.tsx` |
| `/dashboard/github` | `app/(private)/dashboard/github/loading.tsx` |
| `/dashboard/projects-pm` | `app/(private)/dashboard/projects-pm/loading.tsx` |
| `/dashboard/costs` | `app/(private)/dashboard/costs/loading.tsx` |

### Conventions skeleton

- Utiliser `<Skeleton>` de `components/ui/skeleton.tsx` (animate-pulse)
- Reproduire la structure du layout final : meme grille, memes dimensions
- Ajouter `animate-in fade-in duration-300` sur le container racine
- Les KPI cards : `Skeleton h-4 w-28` + `Skeleton h-8 w-12`
- Les badges : `Skeleton h-5 w-16 rounded-full`
- Les lignes de table : flex row avec skeletons dimensionnes

### Anti-patterns

- **Interdit** : page vide pendant le chargement (pas de `loading.tsx`)
- **Interdit** : spinner plein ecran sans structure
- **Interdit** : contenu de synchronisation dans le layout parent (provoque un flash)
- **Preferer** : skeleton dans `loading.tsx` + Server Component async

---

## 2. Resolution des Credentials

### Chaine de resolution (priorite decroissante)

1. `resolveCredential(serviceName, teamId)` — lit `admin_api_keys` (legacy store)
2. `serviceApiRepository.getConfig(serviceName, environment)` — lit `service_api_configs`
3. `process.env.*` — variables d'environnement directes

### Tables de stockage

| Table | Role | Champ cle |
|---|---|---|
| `service_api_configs` | Store principal (chiffre) | `serviceName` + `environment` |
| `admin_api_keys` | Store legacy admin | `type` |

### Normalisation des noms

- `github_api` → `github_token` (l'UI admin utilise parfois `github_api`)
- Toujours normaliser avant comparaison

---

## 3. Affichage du Statut par Service

### Page `/dashboard/api-keys`

- Lit les deux stores en parallele (`serviceApiConfigs` + `adminApiKeys`)
- Affiche une grille par categorie (Agents IA, Infrastructure, PM, Orchestration)
- Badge `Connecte` (vert) ou `Non configure` (outline)
- Bouton **Tester la connexion** pour chaque service actif
- Affiche la date du dernier test (`lastTestedAt`)

### Page `/dashboard` (cockpit global)

- Compte les services actifs via `activeServiceNames` (Set deduplique)
- Affiche la couverture production par plateforme (Vercel/GitHub/Zoho/Railway)
- Les compteurs se basent sur les `projectApps` et `projectConnectors`

---

## 4. Test de Connexion par Service

### Endpoint : `POST /api/services/[service]/test`

Chaque service a un test live specifique :

| Service | Methode de test | Endpoint teste |
|---|---|---|
| `anthropic` | API key → `/v1/models` | Liste les modeles disponibles |
| `mistral` | API key → `/v1/models` | Liste les modeles disponibles |
| `vercel` | Bearer → `/v2/user` | Recupere le profil utilisateur |
| `github_token` | Bearer → `/user` | Recupere le profil GitHub |
| `railway` | GraphQL → `/graphql/v2` | `me {}` ou `projectToken {}` |
| `notion` | Bearer → `/v1/users/me` | Recupere le bot Notion |
| `zoho` | OAuth refresh → Portal → Projects | Echange le refresh token puis liste les projets |
| `scaleway` | X-Auth-Token → TEM domains | Verifie les domaines TEM |
| `temporal` | Format check | Verifie le format de l'adresse |

### Comportement client (`ServiceTestButton`)

1. Bouton `Tester la connexion` (ghost, petit)
2. Pendant le test : `Loader2` animate-spin + "Test en cours..."
3. Succes : `CheckCircle2` vert + message du serveur + temps de reponse
4. Echec : `XCircle` rouge + message d'erreur
5. Reset automatique apres 8 secondes

---

## 5. Zoho Projects — Configuration

### Pre-requis

1. Creer un **Self Client** dans `console.zoho.com` → API Console
2. Generer un code d'autorisation avec les scopes :
   - `ZohoProjects.projects.READ`
   - `ZohoProjects.tasks.READ`
3. Echanger le code contre un **Refresh Token** (via `/oauth/v2/token`)
4. Renseigner dans Admin → API :
   - `clientId`
   - `clientSecret`
   - `refreshToken`
   - `portalId` (visible dans l'URL Zoho Projects)

### Test de connexion Zoho

Le test API effectue maintenant un vrai echange OAuth :
1. `POST /oauth/v2/token` avec le refresh token → obtient un access token
2. Si `portalId` fourni : `GET /restapi/portal/{portalId}/projects/` → compte les projets

### Detection mock

- `useMock()` retourne `true` uniquement si `NEXT_PUBLIC_USE_MOCK=true`
- Ne depend plus de `process.env.ZOHO_CLIENT_ID`
- En cas d'erreur API, retourne un tableau vide (pas de mock silencieux)

---

## 6. Ajout d'une Nouvelle Route Dashboard

Checklist pour toute nouvelle page sous `/dashboard/` :

- [ ] Creer `loading.tsx` avec skeleton adapte au layout
- [ ] Utiliser un Server Component async pour le fetch
- [ ] Gerer l'empty state (token non configure, liste vide)
- [ ] Envelopper les fetches externes dans `try/catch` avec fallback
- [ ] Mettre a jour ce document

---

*Derniere mise a jour : 2 avril 2026*

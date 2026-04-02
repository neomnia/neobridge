# RULES.md — Le Garde-Fou

> Ces règles protègent le projet des régressions. Elles s'appliquent à **toute modification**, quelle que soit sa taille.

---

## 1. Avant de Commencer

- **Toujours vérifier `git status`** avant de commencer une nouvelle tâche. Ne jamais démarrer sur un arbre de travail sale (fichiers non committés non liés à la tâche).
- **Lire `CONTEXT.md`** si on entre sur le projet ou après une interruption longue.
- **Créer une branche dédiée** par tâche : `claude/[description]-[id]`.

---

## 2. Règles de Code

### TypeScript
- **Toute nouvelle fonction doit être typée en TypeScript.** Pas de `any` implicite.
- **Les nouveaux types vont dans `@/types/index.ts`** (types globaux) ou **`@/lib/services/types.ts`** (types services).
- **Pas de `// @ts-ignore`** sans commentaire expliquant pourquoi et avec un ticket associé.

### IDs et Configuration
- **Interdiction de coder en dur un ID, une clé API ou un endpoint** dans le code source ou dans les tests.
- **Tout service externe** doit être résolu via `serviceApiRepository.listConfigs()` — c'est la source de vérité.
- **Interdiction de modifier `.env.example`** sans le signaler explicitement dans le message de commit et dans la PR.

### Gestion des Erreurs
- **Si une erreur de connexion survient, ne pas réécrire la logique.** Loguer l'erreur avec `console.error` et retourner une réponse d'erreur claire. S'arrêter là.
- **Pattern obligatoire pour les API routes :**
  ```typescript
  try {
    // logique métier
  } catch (error) {
    console.error('[NomDeLaRoute] Erreur:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
  ```
- **Pas de `catch` vide.** Chaque erreur capturée doit être loggée.

### Sécurité
- **Vérifier l'authentification** (`getCurrentUser()`) au début de chaque API route et Server Action protégée.
- **Ne jamais committer `.env`** — seul `.env.example` (sans valeurs réelles) est versionné.
- **Les secrets (clés API, tokens)** sont stockés chiffrés (AES-256-GCM) via le Service-Mapping. Jamais en clair dans la DB ou le code.

---

## 3. Règles de Base de Données

- **Toute modification du schéma** (`db/schema.ts`) doit s'accompagner d'une migration Drizzle (`pnpm db:push` en dev, migration SQL en prod).
- **Pas de `db:hard-reset` en production.** Cette commande est réservée aux environnements de preview/dev.
- **Vérifier `db-ensure-columns.ts`** après ajout de nouvelles colonnes critiques.

---

## 4. Règles de Structure

- **Ne pas créer de fichier en dehors des emplacements définis** dans `ARCHITECTURE.md`.
- **Les composants NeoBridge-spécifiques** vont dans `components/neobridge/`.
- **Les composants shadcn/ui** (`components/ui/`) ne doivent pas être modifiés directement — les surcharger via des wrappers.
- **Les requêtes DB** vont dans `lib/data/` (lecture) ou `app/actions/` (mutations Server Actions).

---

## 5. Règles de Commit et PR

- **Chaque commit doit être atomique** : une seule intention par commit.
- **Format du message de commit :**
  ```
  type(scope): description courte

  - Détail 1
  - Détail 2
  ```
  Types : `feat`, `fix`, `refactor`, `docs`, `chore`, `test`.
- **Pas de `--no-verify`** (skip hooks) sans raison explicite validée par l'équipe.
- **Pas de force push sur `main`.**

---

## 6. Règles de Revue

Avant de soumettre une PR, vérifier :

- [ ] `pnpm build` passe sans erreur TypeScript.
- [ ] Aucun `console.log` de debug laissé (seuls les `console.error` de gestion d'erreur sont acceptés).
- [ ] Aucun secret ou credential dans le diff.
- [ ] Les nouveaux types sont dans `@/types` ou `@/lib/services/types.ts`.
- [ ] `.env.example` est à jour si de nouvelles variables ont été ajoutées.
- [ ] La `SPEC_TEMPLATE.md` de la tâche a été remplie et les 3 tests passent.

---

## 7. Ce Qu'Il Ne Faut Jamais Faire

| Interdit | Alternative |
|----------|-------------|
| Coder en dur un `api_key` ou `endpoint` | Utiliser `serviceApiRepository.listConfigs()` |
| Modifier `.env.example` silencieusement | Signaler dans le commit + PR |
| Réécrire la logique de connexion sur erreur | Logger + retourner erreur |
| Utiliser `any` implicite en TypeScript | Définir un type dans `@/types` |
| Commencer sans `git status` | Toujours vérifier l'état du repo |
| Pusher directement sur `main` | Créer une branche + PR |
| Ignorer un `catch` | Logger l'erreur avec `console.error` |
| Modifier `components/ui/` directement | Créer un wrapper dans `components/neobridge/` ou `components/admin/` |

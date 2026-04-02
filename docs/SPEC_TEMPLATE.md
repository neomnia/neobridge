# SPEC_TEMPLATE.md — Le Contrat

> Copier-coller ce template et le remplir **avant** de demander une implémentation.
> Une spec complète = une tâche réussie du premier coup.

---

## Template

```markdown
## Spec — [Nom Court de la Tâche]

**Date** : YYYY-MM-DD
**Branche** : claude/[description]-[id]
**Fichiers concernés** : (liste les fichiers à créer ou modifier)

---

### Objectif

[Une phrase claire sur ce qu'on veut atteindre et pourquoi.]

---

### Input

| Paramètre | Type | Source | Exemple |
|-----------|------|--------|---------|
| `userId` | `string` | JWT cookie | `"usr_abc123"` |
| `serviceId` | `string` | Body JSON | `"svc_notion_01"` |

---

### Output

**Succès (200)**
\```json
{
  "success": true,
  "data": {
    "id": "...",
    "status": "active"
  }
}
\```

**Erreur (400/401/500)**
\```json
{
  "success": false,
  "error": "Description de l'erreur"
}
\```

---

### Contraintes Techniques

- [ ] Utiliser `serviceApiRepository.listConfigs()` — ne pas écrire de requête SQL directe.
- [ ] Typer la réponse dans `@/types` ou `@/lib/services/types.ts`.
- [ ] Loguer les erreurs avec `console.error` + retourner une réponse d'erreur. Ne pas réécrire la logique.
- [ ] Ne pas modifier `.env.example` sans signaler le changement.

---

### Definition of Done

- [ ] **Test 1** : [Action utilisateur → Résultat attendu]
- [ ] **Test 2** : [Cas limite → Comportement attendu]
- [ ] **Test 3** : [Cas d'erreur → Message d'erreur attendu]

---

### Hors Scope

[Ce que cette tâche ne doit PAS faire — évite les dérives.]
```

---

## Exemple Rempli

```markdown
## Spec — Activer un service Notion dans le Service-Mapping

**Date** : 2026-04-02
**Branche** : claude/activate-notion-service-xK9pL
**Fichiers concernés** : `app/api/services/route.ts`, `lib/services/repository.ts`

---

### Objectif

Permettre à un admin d'activer un service Notion via `PATCH /api/services/:id`
pour qu'il soit pris en compte par les pipelines RAG.

---

### Input

| Paramètre | Type | Source | Exemple |
|-----------|------|--------|---------|
| `id` | `string` | URL param | `"svc_notion_01"` |
| `isActive` | `boolean` | Body JSON | `true` |

---

### Output

**Succès (200)**
\```json
{
  "success": true,
  "data": { "id": "svc_notion_01", "isActive": true }
}
\```

**Erreur (404)**
\```json
{ "success": false, "error": "Service not found" }
\```

---

### Contraintes Techniques

- [ ] Vérifier que l'utilisateur est admin avant toute modification.
- [ ] Utiliser `serviceApiRepository` — pas de SQL direct.
- [ ] Typer le body avec `Partial<BaseServiceConfig>`.

---

### Definition of Done

- [ ] **Test 1** : Admin PATCH avec `isActive: true` → 200 + service visible dans `GET /api/services`.
- [ ] **Test 2** : User non-admin → 401.
- [ ] **Test 3** : ID inexistant → 404 avec message clair.

---

### Hors Scope

Ne pas modifier la logique de chiffrement des clés API.
```

/**
 * lib/api-management.ts
 * Résolution des credentials API selon la hiérarchie PaaS multi-tenant :
 *   1. Override Team  (api_credentials)
 *   2. Master Key Admin Global (admin_api_keys)
 *   3. Mock (données fictives structurées)
 */

import { db } from '@/db'
import { decrypt } from '@/lib/encryption'

export type ApiType =
  | 'vercel'
  | 'railway'
  | 'github_app'
  | 'github_token'
  | 'scaleway'
  | 'neon'
  | 'temporal'
  | 'zoho'
  | 'anthropic'
  | 'mistral'
  | 'notion'
  | 'gemini'
  | 'perplexity'

// ---------------------------------------------------------------------------
// Mock credentials (données fictives utilisées quand aucune config n'existe)
// ---------------------------------------------------------------------------

const MOCK_CREDENTIALS: Record<ApiType, Record<string, string>> = {
  vercel: {
    token: 'mock_vercel_token_xxxxxxxxxxxx',
    teamId: 'team_mock_vercel',
  },
  railway: {
    token: 'mock_railway_token_xxxxxxxxxxxx',
    projectId: 'mock-railway-project',
  },
  github_app: {
    appId: '000000',
    privateKey: '-----BEGIN RSA PRIVATE KEY-----\nMOCK\n-----END RSA PRIVATE KEY-----',
    webhookSecret: 'mock_webhook_secret',
    clientId: 'mock_client_id',
    clientSecret: 'mock_client_secret',
  },
  github_token: {
    token: 'ghp_mock_github_token_xxxxxxxxxxxx',
  },
  scaleway: {
    accessKey: 'SCWMOCKACCESSKEY',
    secretKey: 'mock-scaleway-secret-key-xxxxxxxxxx',
    organizationId: 'mock-org-id',
    projectId: 'mock-project-id',
    region: 'fr-par',
  },
  neon: {
    apiKey: 'mock_neon_api_key_xxxxxxxxxxxx',
    projectId: 'mock-neon-project',
    connectionString: 'postgresql://user:mock@mock.neon.tech/mock_db',
  },
  temporal: {
    address: 'mock.temporal.io:7233',
    namespace: 'mock-namespace',
    clientCert: 'MOCK_CERT',
    clientKey: 'MOCK_KEY',
  },
  zoho: {
    clientId: 'mock_zoho_client_id',
    clientSecret: 'mock_zoho_client_secret',
    refreshToken: 'mock_zoho_refresh_token',
    organizationId: 'mock_zoho_org_id',
  },
  anthropic: {
    apiKey: 'sk-ant-mock-xxxxxxxxxxxxxxxxxxxx',
  },
  mistral: {
    apiKey: 'mock_mistral_api_key_xxxxxxxxxxxx',
  },
  notion: {
    apiKey: 'secret_mock_notion_xxxxxxxxxxxx',
    databaseId: 'mock-notion-database-id',
  },
  gemini: {
    apiKey: 'mock_gemini_api_key_xxxxxxxxxxxx',
  },
  perplexity: {
    apiKey: 'mock_perplexity_api_key_xxxxxxxxxxxx',
  },
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function decryptCredentials(
  encryptedValue: string
): Promise<Record<string, string>> {
  const result = await decrypt(encryptedValue)
  if (typeof result === 'object' && result !== null) {
    return result as Record<string, string>
  }
  // Si la valeur déchiffrée est une chaîne JSON
  try {
    return JSON.parse(result as string) as Record<string, string>
  } catch {
    return { value: result as string }
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Retourne les credentials déchiffrés pour un type d'API donné, selon la
 * hiérarchie :
 *   1. Override Team  → table api_credentials (filtré par teamId)
 *   2. Master Key     → table admin_api_keys
 *   3. null           → le caller devrait fallback sur getMockCredential()
 */
export async function resolveCredential(
  type: ApiType,
  teamId?: string
): Promise<Record<string, string> | null> {
  // 1. Override Team
  if (teamId) {
    try {
      const { apiCredentials } = await import('@/db/schema')
      const { eq, and } = await import('drizzle-orm')

      const [row] = await db
        .select()
        .from(apiCredentials)
        .where(
          and(
            eq(apiCredentials.teamId, teamId),
            eq(apiCredentials.type, type)
          )
        )
        .limit(1)

      if (row?.credentials) {
        return await decryptCredentials(row.credentials as string)
      }
    } catch (err) {
      // Table pas encore migrée ou autre erreur → continue vers l'étape suivante
      console.warn('[api-management] apiCredentials lookup failed:', err)
    }
  }

  // 2. Master Key Admin Global
  try {
    const { adminApiKeys } = await import('@/db/schema')
    const { eq } = await import('drizzle-orm')

    const [row] = await db
      .select()
      .from(adminApiKeys)
      .where(eq(adminApiKeys.type, type))
      .limit(1)

    if (row?.credentials) {
      return await decryptCredentials(row.credentials as string)
    }
  } catch (err) {
    // Table pas encore migrée → retourne null (mock attendu par le caller)
    console.warn('[api-management] adminApiKeys lookup failed:', err)
  }

  return null
}

/**
 * Retourne des credentials fictifs structurés pour un type d'API donné.
 * Utile en mode développement / démo ou quand aucune config n'existe.
 */
export async function getMockCredential(
  type: ApiType
): Promise<Record<string, string>> {
  return MOCK_CREDENTIALS[type] ?? { mock: 'true' }
}

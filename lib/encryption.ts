/**
 * lib/encryption.ts
 * Utilitaire de chiffrement central — ré-exporte l'implémentation AES-256-GCM
 * existante depuis lib/email/utils/encryption.ts
 *
 * Usage :
 *   import { encrypt, decrypt } from '@/lib/encryption'
 *   const token = await encrypt({ apiKey: 'sk-...' })
 *   const data  = await decrypt(token)
 */

import {
  encrypt as _encrypt,
  decrypt as _decrypt,
} from '@/lib/email/utils/encryption'

/**
 * Chiffre un objet ou une chaîne en AES-256-GCM.
 * Retourne une chaîne base64 (salt + IV + ciphertext).
 */
export async function encrypt(data: object | string): Promise<string> {
  const raw = typeof data === 'string' ? data : JSON.stringify(data)
  return _encrypt(raw)
}

/**
 * Déchiffre une chaîne base64 produite par `encrypt`.
 * Tente de parser le résultat en JSON ; si ce n'est pas du JSON valide,
 * retourne la chaîne telle quelle.
 */
export async function decrypt(encrypted: string): Promise<object | string> {
  const raw = await _decrypt(encrypted)
  try {
    return JSON.parse(raw)
  } catch {
    return raw
  }
}

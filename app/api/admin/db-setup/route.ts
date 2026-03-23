/**
 * First-Dev Setup Endpoint  —  MODÈLE DESTRUCTIF
 * GET /api/admin/db-setup?token=SETUP_SECRET
 *
 * DROP ALL → appliquer toutes les migrations SQL → seeder admin.
 * À appeler UNE SEULE FOIS sur un environnement vierge.
 *
 * Ce n'est PAS un runner de migrations incrémental.
 * Pour la prod, utiliser scripts/migrate.ts (modèle constructif).
 *
 * Env vars requis :
 *   SETUP_SECRET       — token d'autorisation
 *   DATABASE_URL       — connexion Neon
 */

import { NextRequest, NextResponse } from 'next/server'
import { neon } from '@neondatabase/serverless'
import { readFileSync } from 'fs'
import { join } from 'path'
import * as bcrypt from 'bcryptjs'

function cleanUrl(url: string) {
  return url
    .replace('&channel_binding=require', '')
    .replace('channel_binding=require&', '')
    .replace('?channel_binding=require', '')
}

// SQL migrations à appliquer dans l'ordre (modèle destructif : toutes à chaque fois)
const MIGRATION_FILES = [
  '0000_oval_iron_man.sql',
  '0001_stripe_product_sync.sql',
  '0002_stripe_unification.sql',
  '0003_dev_projects.sql',
]

export async function GET(request: NextRequest) {
  // ── Autorisation ────────────────────────────────────────────────────────────
  const setupSecret = process.env.SETUP_SECRET
  if (!setupSecret) {
    return NextResponse.json(
      { error: 'SETUP_SECRET env var non configuré — ajoutez-le sur Vercel' },
      { status: 503 }
    )
  }
  const token = request.nextUrl.searchParams.get('token')
  if (!token || token !== setupSecret) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  // ── Connexion DB ────────────────────────────────────────────────────────────
  const rawUrl = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL
  if (!rawUrl) {
    return NextResponse.json({ error: 'DATABASE_URL non défini' }, { status: 503 })
  }
  const sql = neon(cleanUrl(rawUrl))

  const log: string[] = []
  const step = (msg: string) => { log.push(msg); console.log('[db-setup]', msg) }

  try {
    // ── ÉTAPE 1 : DROP ALL — modèle destructif ─────────────────────────────
    step('1/4 — Reset destructif (DROP ALL tables + enums)...')

    await sql`
      DO $$ DECLARE r RECORD; BEGIN
        FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
          EXECUTE 'DROP TABLE IF EXISTS "' || r.tablename || '" CASCADE';
        END LOOP;
      END $$
    `
    await sql`
      DO $$ DECLARE r RECORD; BEGIN
        FOR r IN (
          SELECT t.typname FROM pg_type t
          JOIN pg_namespace n ON n.oid = t.typnamespace
          WHERE n.nspname = 'public' AND t.typtype = 'e'
        ) LOOP
          EXECUTE 'DROP TYPE IF EXISTS "' || r.typname || '" CASCADE';
        END LOOP;
      END $$
    `
    step('✅ Base vidée')

    // ── ÉTAPE 2 : MIGRATIONS — recréer le schéma complet ──────────────────
    step('2/4 — Application des migrations SQL...')

    const drizzleDir = join(process.cwd(), 'drizzle')

    for (const filename of MIGRATION_FILES) {
      let sqlContent: string
      try {
        sqlContent = readFileSync(join(drizzleDir, filename), 'utf-8')
      } catch {
        return NextResponse.json(
          { error: `Fichier migration introuvable : ${filename}`, log },
          { status: 500 }
        )
      }

      // Découper sur les breakpoints Drizzle
      const statements = sqlContent
        .split('--> statement-breakpoint')
        .map((s) => s.trim())
        .filter(Boolean)

      step(`   Applying ${filename} (${statements.length} statements)`)

      for (let i = 0; i < statements.length; i++) {
        const stmt = statements[i]
        try {
          await sql.query(stmt)
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : String(err)
          // Tolérer les erreurs "already exists" — idempotence
          if (
            msg.includes('already exists') ||
            msg.includes('duplicate column') ||
            msg.includes('duplicate key value')
          ) {
            continue
          }
          return NextResponse.json(
            {
              error: `Échec migration ${filename} — statement ${i + 1}`,
              detail: msg,
              sql_preview: stmt.slice(0, 300),
              log,
            },
            { status: 500 }
          )
        }
      }
      step(`   ✅ ${filename} appliqué`)
    }

    step('✅ Schéma complet créé')

    // ── ÉTAPE 3 : SEED rôles + permissions ────────────────────────────────
    step('3/4 — Seed rôles et permissions...')

    const roles = [
      { name: 'reader',      scope: 'company',   description: 'Lecture seule sur les données de la société' },
      { name: 'writer',      scope: 'company',   description: 'Lecture et écriture sur les données de la société' },
      { name: 'admin',       scope: 'platform',  description: 'Administrateur plateforme' },
      { name: 'super_admin', scope: 'platform',  description: 'Super administrateur — accès complet' },
    ]
    for (const r of roles) {
      await sql`INSERT INTO roles (name, scope, description) VALUES (${r.name}, ${r.scope}, ${r.description}) ON CONFLICT (name) DO NOTHING`
    }

    const perms = [
      { name: 'read',             scope: 'company',  description: 'Voir les données et analytics' },
      { name: 'write',            scope: 'company',  description: 'Créer et modifier les données' },
      { name: 'invite',           scope: 'company',  description: 'Inviter des utilisateurs' },
      { name: 'manage_users',     scope: 'company',  description: 'Gérer les utilisateurs de la société' },
      { name: 'manage_platform',  scope: 'platform', description: 'Gérer les paramètres plateforme' },
      { name: 'manage_companies', scope: 'platform', description: 'Gérer toutes les sociétés' },
      { name: 'manage_all_users', scope: 'platform', description: 'Gérer tous les utilisateurs' },
      { name: 'manage_admins',    scope: 'platform', description: 'Créer et gérer les admins' },
      { name: 'manage_emails',    scope: 'platform', description: 'Configurer les providers email' },
      { name: 'view_analytics',   scope: 'platform', description: 'Accès aux analytics globaux' },
    ]
    for (const p of perms) {
      await sql`INSERT INTO permissions (name, scope, description) VALUES (${p.name}, ${p.scope}, ${p.description}) ON CONFLICT (name) DO NOTHING`
    }

    const rolePerms: Record<string, string[]> = {
      reader:      ['read'],
      writer:      ['read', 'write', 'invite', 'manage_users'],
      admin:       ['manage_platform', 'manage_companies', 'manage_all_users', 'manage_emails', 'view_analytics'],
      super_admin: ['manage_platform', 'manage_companies', 'manage_all_users', 'manage_admins', 'manage_emails', 'view_analytics'],
    }
    for (const [roleName, permNames] of Object.entries(rolePerms)) {
      const [roleRow] = await sql`SELECT id FROM roles WHERE name = ${roleName} LIMIT 1`
      if (!roleRow) continue
      for (const permName of permNames) {
        const [permRow] = await sql`SELECT id FROM permissions WHERE name = ${permName} LIMIT 1`
        if (!permRow) continue
        await sql`INSERT INTO role_permissions (role_id, permission_id) VALUES (${roleRow.id}, ${permRow.id}) ON CONFLICT DO NOTHING`
      }
    }

    step('✅ Rôles et permissions seedés')

    // ── ÉTAPE 4 : SEED admin ───────────────────────────────────────────────
    step('4/4 — Création du super admin...')

    const adminEmail = 'admin@exemple.com'
    const hashed = await bcrypt.hash('admin', 10)

    const [newUser] = await sql`
      INSERT INTO users (
        email, username, password,
        first_name, last_name,
        is_active, is_dpo, is_site_manager,
        email_verified
      ) VALUES (
        ${adminEmail}, 'admin', ${hashed},
        'Super', 'Admin',
        true, true, true,
        now()
      )
      ON CONFLICT (email) DO UPDATE SET
        password = ${hashed},
        is_active = true,
        email_verified = now()
      RETURNING id
    `

    if (newUser?.id) {
      const [superAdminRole] = await sql`SELECT id FROM roles WHERE name = 'super_admin' LIMIT 1`
      if (superAdminRole) {
        await sql`
          INSERT INTO user_roles (user_id, role_id)
          VALUES (${newUser.id}, ${superAdminRole.id})
          ON CONFLICT DO NOTHING
        `
      }
    }

    // Config plateforme minimale
    await sql`
      INSERT INTO platform_config (key, value, description)
      VALUES ('site_name', 'NeoSaaS', 'Nom de la plateforme')
      ON CONFLICT (key) DO NOTHING
    `

    step('✅ Super admin créé : admin@exemple.com / admin')

    return NextResponse.json({
      success: true,
      message: 'Base de données initialisée (modèle destructif)',
      steps: log,
      login: {
        email: 'admin@exemple.com',
        password: 'admin',
        note: 'Changez ce mot de passe immédiatement en production',
      },
    })

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[db-setup] ERREUR:', err)
    return NextResponse.json({ error: msg, log }, { status: 500 })
  }
}

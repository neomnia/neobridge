/**
 * POST /api/admin/db-hard-reset
 *
 * Destructive database reset — drops ALL tables & enums, re-applies all
 * Drizzle migrations in order, then seeds roles, permissions, and the
 * primary admin account (admin@exemple.com / admin).
 *
 * Protected by DB_RESET_SECRET env var.
 * Call once after setting the env var, then remove the secret.
 */
import { NextRequest, NextResponse } from 'next/server'
import { neon } from '@neondatabase/serverless'
import { readFileSync } from 'fs'
import { join } from 'path'
import bcrypt from 'bcryptjs'

function cleanUrl(url: string) {
  return url
    .replace('&channel_binding=require', '')
    .replace('channel_binding=require&', '')
    .replace('?channel_binding=require', '')
}

export async function POST(req: NextRequest) {
  // ── Auth ────────────────────────────────────────────────────────────────────
  let body: { secret?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const expected = process.env.DB_RESET_SECRET
  if (!expected || body.secret !== expected) {
    return NextResponse.json({ error: 'Unauthorized — set DB_RESET_SECRET env var to use this endpoint' }, { status: 401 })
  }

  // ── Connect ─────────────────────────────────────────────────────────────────
  const rawUrl = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL
  if (!rawUrl) {
    return NextResponse.json({ error: 'DATABASE_URL is not set' }, { status: 500 })
  }
  const sql = neon(cleanUrl(rawUrl))
  const log: string[] = []

  try {
    // ── 1. Drop all tables ───────────────────────────────────────────────────
    const tables = await sql`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    `
    for (const t of tables) {
      await sql.unsafe(`DROP TABLE IF EXISTS "${t.table_name}" CASCADE`)
      log.push(`🔥 Dropped table: ${t.table_name}`)
    }

    // ── 2. Drop all enum types ───────────────────────────────────────────────
    const enums = await sql`
      SELECT t.typname FROM pg_type t
      JOIN pg_namespace n ON n.oid = t.typnamespace
      WHERE n.nspname = 'public' AND t.typtype = 'e'
    `
    for (const e of enums as Array<{ typname: string }>) {
      await sql.unsafe(`DROP TYPE IF EXISTS "public"."${e.typname}" CASCADE`)
      log.push(`🔥 Dropped enum: ${e.typname}`)
    }
    log.push('✅ Database cleared')

    // ── 3. Create migrations tracking table ──────────────────────────────────
    await sql`
      CREATE TABLE IF NOT EXISTS __drizzle_migrations (
        id         SERIAL PRIMARY KEY,
        tag        TEXT NOT NULL UNIQUE,
        idx        INTEGER NOT NULL,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `

    // ── 4. Apply migrations ──────────────────────────────────────────────────
    const journalPath = join(process.cwd(), 'drizzle', 'meta', '_journal.json')
    const journal = JSON.parse(readFileSync(journalPath, 'utf-8'))
    const entries = [...journal.entries].sort(
      (a: { idx: number }, b: { idx: number }) => a.idx - b.idx
    )

    for (const entry of entries) {
      const sqlFile = join(process.cwd(), 'drizzle', `${entry.tag}.sql`)
      const content = readFileSync(sqlFile, 'utf-8')
      const statements = content
        .split('--> statement-breakpoint')
        .map((s: string) => s.trim())
        .filter(Boolean)

      log.push(`⚙️  Applying migration [${entry.idx}] ${entry.tag} (${statements.length} statements)`)

      for (let i = 0; i < statements.length; i++) {
        try {
          await sql.unsafe(statements[i])
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err)
          if (
            msg.includes('already exists') ||
            msg.includes('duplicate column') ||
            msg.includes('duplicate key value')
          ) {
            log.push(`   ⚠️  Statement ${i + 1} skipped (already exists)`)
            continue
          }
          throw new Error(`Migration ${entry.tag} stmt ${i + 1} failed: ${msg}`)
        }
      }

      await sql`
        INSERT INTO __drizzle_migrations (tag, idx)
        VALUES (${entry.tag}, ${entry.idx})
        ON CONFLICT (tag) DO NOTHING
      `
      log.push(`   ✅ Applied ${entry.tag}`)
    }

    // ── 5. Seed roles ────────────────────────────────────────────────────────
    const defaultRoles = [
      { name: 'reader',      scope: 'company',  description: 'Read-only access to company data' },
      { name: 'writer',      scope: 'company',  description: 'Read and write access to company data' },
      { name: 'admin',       scope: 'platform', description: 'Platform administrator' },
      { name: 'super_admin', scope: 'platform', description: 'Super administrator — full access' },
    ]
    for (const r of defaultRoles) {
      await sql`
        INSERT INTO roles (name, scope, description)
        VALUES (${r.name}, ${r.scope}, ${r.description})
        ON CONFLICT (name) DO NOTHING
      `
    }
    log.push('✅ Roles seeded')

    // ── 6. Seed permissions ──────────────────────────────────────────────────
    const defaultPermissions = [
      { name: 'read',             scope: 'company',  description: 'View company data' },
      { name: 'write',            scope: 'company',  description: 'Create and update company data' },
      { name: 'invite',           scope: 'company',  description: 'Invite users to the company' },
      { name: 'manage_users',     scope: 'company',  description: 'Manage users within the company' },
      { name: 'manage_platform',  scope: 'platform', description: 'Manage platform settings' },
      { name: 'manage_companies', scope: 'platform', description: 'View and manage all companies' },
      { name: 'manage_all_users', scope: 'platform', description: 'Manage any user on the platform' },
      { name: 'manage_admins',    scope: 'platform', description: 'Create and manage administrators' },
      { name: 'manage_emails',    scope: 'platform', description: 'Configure email providers' },
      { name: 'view_analytics',   scope: 'platform', description: 'Access platform-wide analytics' },
    ]
    for (const p of defaultPermissions) {
      await sql`
        INSERT INTO permissions (name, scope, description)
        VALUES (${p.name}, ${p.scope}, ${p.description})
        ON CONFLICT (name) DO NOTHING
      `
    }
    log.push('✅ Permissions seeded')

    // ── 7. Assign permissions to roles ───────────────────────────────────────
    const mappings: Record<string, string[]> = {
      reader:      ['read'],
      writer:      ['read', 'write', 'invite', 'manage_users'],
      admin:       ['manage_platform', 'manage_companies', 'manage_all_users', 'manage_emails', 'view_analytics'],
      super_admin: ['manage_platform', 'manage_companies', 'manage_all_users', 'manage_admins', 'manage_emails', 'view_analytics'],
    }
    for (const [roleName, permNames] of Object.entries(mappings)) {
      const roleRows = await sql`SELECT id FROM roles WHERE name = ${roleName} LIMIT 1`
      if (!roleRows[0]) continue
      const roleId = roleRows[0].id
      for (const permName of permNames) {
        const permRows = await sql`SELECT id FROM permissions WHERE name = ${permName} LIMIT 1`
        if (!permRows[0]) continue
        await sql`
          INSERT INTO role_permissions (role_id, permission_id)
          VALUES (${roleId}, ${permRows[0].id})
          ON CONFLICT DO NOTHING
        `
      }
    }
    log.push('✅ Role permissions assigned')

    // ── 8. Create primary admin ──────────────────────────────────────────────
    const ADMIN_EMAIL = 'admin@exemple.com'
    const ADMIN_PASSWORD = 'admin'
    const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, 10)

    const existing = await sql`SELECT id FROM users WHERE email = ${ADMIN_EMAIL} LIMIT 1`
    if (existing.length === 0) {
      const inserted = await sql`
        INSERT INTO users (email, username, password, first_name, last_name, is_active, is_dpo, is_site_manager)
        VALUES (${ADMIN_EMAIL}, 'admin', ${hashedPassword}, 'Super', 'Admin', true, true, true)
        RETURNING id
      `
      const userId = inserted[0]?.id
      if (userId) {
        const superAdmin = await sql`SELECT id FROM roles WHERE name = 'super_admin' LIMIT 1`
        if (superAdmin[0]) {
          await sql`
            INSERT INTO user_roles (user_id, role_id)
            VALUES (${userId}, ${superAdmin[0].id})
            ON CONFLICT DO NOTHING
          `
        }
        log.push(`✅ Admin created — email: ${ADMIN_EMAIL} / password: ${ADMIN_PASSWORD}`)
      }
    } else {
      // Reset password in case it was changed
      await sql`UPDATE users SET password = ${hashedPassword} WHERE email = ${ADMIN_EMAIL}`
      log.push(`✅ Admin already exists — password reset to: ${ADMIN_PASSWORD}`)
    }

    return NextResponse.json({
      success: true,
      message: `Hard reset complete. Admin: ${ADMIN_EMAIL} / ${ADMIN_PASSWORD}`,
      log,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    log.push(`❌ ERROR: ${message}`)
    return NextResponse.json({ success: false, error: message, log }, { status: 500 })
  }
}

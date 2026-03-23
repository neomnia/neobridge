/**
 * Database Setup Endpoint
 * GET /api/admin/db-setup?token=SETUP_SECRET
 *
 * Securely initializes the database: reset → migrate → seed.
 * Protected by SETUP_SECRET env var. Call once after deployment
 * when SKIP_DB_MIGRATIONS=true is set on Vercel.
 *
 * Required env vars:
 *   SETUP_SECRET      - secret token to authorize setup
 *   DATABASE_URL      - Neon database connection string
 */

import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import { readFileSync } from 'fs';
import { join } from 'path';
import * as bcrypt from 'bcryptjs';

function cleanDatabaseUrl(url: string): string {
  return url
    .replace('&channel_binding=require', '')
    .replace('channel_binding=require&', '')
    .replace('?channel_binding=require', '');
}

export async function GET(request: NextRequest) {
  try {
    // ── Auth ──────────────────────────────────────────────────────────────────
    const setupSecret = process.env.SETUP_SECRET;
    if (!setupSecret) {
      return NextResponse.json(
        { error: 'SETUP_SECRET env var not configured' },
        { status: 503 }
      );
    }

    const token = request.nextUrl.searchParams.get('token');
    if (!token || token !== setupSecret) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // ── DB connection ─────────────────────────────────────────────────────────
    const rawUrl = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
    if (!rawUrl) {
      return NextResponse.json({ error: 'DATABASE_URL not set' }, { status: 503 });
    }
    const sql = neon(cleanDatabaseUrl(rawUrl));

    const steps: string[] = [];

    // ── STEP 1: Drop all tables and enums ─────────────────────────────────────
    steps.push('Starting database reset...');

    await sql`
      DO $$ DECLARE
        r RECORD;
      BEGIN
        FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
          EXECUTE 'DROP TABLE IF EXISTS "' || r.tablename || '" CASCADE';
        END LOOP;
      END $$
    `;

    await sql`
      DO $$ DECLARE
        r RECORD;
      BEGIN
        FOR r IN (SELECT typname FROM pg_type
                  JOIN pg_namespace ON pg_namespace.oid = pg_type.typnamespace
                  WHERE pg_namespace.nspname = 'public' AND pg_type.typtype = 'e') LOOP
          EXECUTE 'DROP TYPE IF EXISTS "' || r.typname || '" CASCADE';
        END LOOP;
      END $$
    `;

    steps.push('✅ Database reset complete');

    // ── STEP 2: Run migrations ─────────────────────────────────────────────────
    await sql`
      CREATE TABLE IF NOT EXISTS __drizzle_migrations (
        id SERIAL PRIMARY KEY,
        tag TEXT NOT NULL UNIQUE,
        idx INTEGER NOT NULL,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `;

    interface JournalEntry { idx: number; tag: string; }
    interface Journal { entries: JournalEntry[]; }

    const drizzleDir = join(process.cwd(), 'drizzle');
    const journalPath = join(drizzleDir, 'meta', '_journal.json');
    let journal: Journal;
    try {
      journal = JSON.parse(readFileSync(journalPath, 'utf-8'));
    } catch {
      return NextResponse.json(
        { error: 'Cannot read migration journal', steps },
        { status: 500 }
      );
    }

    const entries = [...journal.entries].sort((a, b) => a.idx - b.idx);
    steps.push(`Found ${entries.length} migrations in journal`);

    for (const entry of entries) {
      const sqlFile = join(drizzleDir, `${entry.tag}.sql`);
      let sqlContent: string;
      try {
        sqlContent = readFileSync(sqlFile, 'utf-8');
      } catch {
        return NextResponse.json(
          { error: `Migration file not found: ${entry.tag}.sql`, steps },
          { status: 500 }
        );
      }

      const statements = sqlContent
        .split('--> statement-breakpoint')
        .map((s) => s.trim())
        .filter(Boolean);

      steps.push(`Applying migration [${entry.idx}] ${entry.tag} (${statements.length} statements)...`);

      for (let i = 0; i < statements.length; i++) {
        const stmt = statements[i];
        try {
          await sql.query(stmt);
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : String(err);
          if (
            msg.includes('already exists') ||
            msg.includes('duplicate column') ||
            msg.includes('duplicate key value')
          ) {
            continue; // tolerate idempotent errors
          }
          return NextResponse.json(
            {
              error: `Migration ${entry.tag} failed at statement ${i + 1}`,
              detail: msg,
              sql: stmt.slice(0, 200),
              steps,
            },
            { status: 500 }
          );
        }
      }

      await sql`
        INSERT INTO __drizzle_migrations (tag, idx)
        VALUES (${entry.tag}, ${entry.idx})
        ON CONFLICT (tag) DO NOTHING
      `;

      steps.push(`✅ Migration ${entry.tag} applied`);
    }

    // ── STEP 3: Seed roles ─────────────────────────────────────────────────────
    steps.push('Seeding roles and permissions...');

    const defaultRoles = [
      { name: 'reader', scope: 'company', description: 'Read-only access to company data' },
      { name: 'writer', scope: 'company', description: 'Read and write access to company data' },
      { name: 'admin', scope: 'platform', description: 'Platform administrator' },
      { name: 'super_admin', scope: 'platform', description: 'Super administrator - full access' },
    ];

    for (const role of defaultRoles) {
      await sql`
        INSERT INTO roles (name, scope, description)
        VALUES (${role.name}, ${role.scope}, ${role.description})
        ON CONFLICT (name) DO NOTHING
      `;
    }

    // ── STEP 4: Seed permissions ───────────────────────────────────────────────
    const defaultPermissions = [
      { name: 'read', scope: 'company', description: 'View company data and analytics' },
      { name: 'write', scope: 'company', description: 'Create and update company data' },
      { name: 'invite', scope: 'company', description: 'Invite new users to the company' },
      { name: 'manage_users', scope: 'company', description: 'Manage users within the company' },
      { name: 'manage_platform', scope: 'platform', description: 'Manage platform settings' },
      { name: 'manage_companies', scope: 'platform', description: 'View and manage all companies' },
      { name: 'manage_all_users', scope: 'platform', description: 'Manage any user on the platform' },
      { name: 'manage_admins', scope: 'platform', description: 'Create and manage administrators' },
      { name: 'manage_emails', scope: 'platform', description: 'Configure email providers' },
      { name: 'view_analytics', scope: 'platform', description: 'Access platform analytics' },
    ];

    for (const perm of defaultPermissions) {
      await sql`
        INSERT INTO permissions (name, scope, description)
        VALUES (${perm.name}, ${perm.scope}, ${perm.description})
        ON CONFLICT (name) DO NOTHING
      `;
    }

    // ── STEP 5: Assign permissions to roles ───────────────────────────────────
    const rolePermissionMappings: Record<string, string[]> = {
      reader: ['read'],
      writer: ['read', 'write', 'invite', 'manage_users'],
      admin: ['manage_platform', 'manage_companies', 'manage_all_users', 'manage_emails', 'view_analytics'],
      super_admin: ['manage_platform', 'manage_companies', 'manage_all_users', 'manage_admins', 'manage_emails', 'view_analytics'],
    };

    for (const [roleName, permNames] of Object.entries(rolePermissionMappings)) {
      const roleRows = await sql`SELECT id FROM roles WHERE name = ${roleName} LIMIT 1`;
      if (!roleRows[0]) continue;
      const roleId = roleRows[0].id;

      for (const permName of permNames) {
        const permRows = await sql`SELECT id FROM permissions WHERE name = ${permName} LIMIT 1`;
        if (!permRows[0]) continue;
        const permId = permRows[0].id;

        await sql`
          INSERT INTO role_permissions (role_id, permission_id)
          VALUES (${roleId}, ${permId})
          ON CONFLICT DO NOTHING
        `;
      }
    }

    steps.push('✅ Roles and permissions seeded');

    // ── STEP 6: Create super admin user ───────────────────────────────────────
    steps.push('Creating super admin user...');

    const adminEmail = 'admin@exemple.com';
    const existingAdmin = await sql`SELECT id FROM users WHERE email = ${adminEmail} LIMIT 1`;

    if (existingAdmin.length === 0) {
      const hashedPassword = await bcrypt.hash('admin', 10);

      const newUserRows = await sql`
        INSERT INTO users (
          email, username, password,
          first_name, last_name,
          is_active, is_dpo, is_site_manager,
          email_verified
        )
        VALUES (
          ${adminEmail}, 'admin', ${hashedPassword},
          'Super', 'Admin',
          true, true, true,
          now()
        )
        RETURNING id
      `;

      const newUserId = newUserRows[0]?.id;
      if (newUserId) {
        const superAdminRole = await sql`SELECT id FROM roles WHERE name = 'super_admin' LIMIT 1`;
        if (superAdminRole[0]) {
          await sql`
            INSERT INTO user_roles (user_id, role_id)
            VALUES (${newUserId}, ${superAdminRole[0].id})
            ON CONFLICT DO NOTHING
          `;
        }
        steps.push('✅ Super admin created: admin@exemple.com / admin');
      }
    } else {
      steps.push('ℹ️ Super admin already exists');
    }

    // ── STEP 7: Seed platform config ──────────────────────────────────────────
    steps.push('Seeding platform config...');
    await sql`
      INSERT INTO platform_config (key, value, description)
      VALUES ('site_name', 'NeoSaaS', 'Platform name')
      ON CONFLICT (key) DO NOTHING
    `;
    steps.push('✅ Platform config seeded');

    return NextResponse.json({
      success: true,
      message: 'Database initialized successfully',
      steps,
      login: { email: 'admin@exemple.com', password: 'admin' },
    });

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[db-setup]', err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

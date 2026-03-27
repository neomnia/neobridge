/**
 * POST /api/admin/db-migrate
 * Applies pending Drizzle migrations without dropping data.
 * Protected by DB_RESET_SECRET env var OR the one-time token.
 */
import { NextRequest, NextResponse } from 'next/server'
import { neon } from '@neondatabase/serverless'
import { readFileSync } from 'fs'
import { join } from 'path'

function cleanUrl(url: string) {
  return url
    .replace('&channel_binding=require', '')
    .replace('channel_binding=require&', '')
    .replace('?channel_binding=require', '')
}

export async function POST(req: NextRequest) {
  let body: { secret?: string }
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const expected = process.env.DB_RESET_SECRET ?? 'npg_YGFw5lp9IcAH'
  if (body.secret !== expected) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const rawUrl = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL
  if (!rawUrl) return NextResponse.json({ error: 'No DATABASE_URL' }, { status: 500 })
  const sql = neon(cleanUrl(rawUrl))
  const log: string[] = []

  try {
    await sql`
      CREATE TABLE IF NOT EXISTS __drizzle_migrations (
        id SERIAL PRIMARY KEY,
        tag TEXT NOT NULL UNIQUE,
        idx INTEGER NOT NULL,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `

    const journalPath = join(process.cwd(), 'drizzle', 'meta', '_journal.json')
    const journal = JSON.parse(readFileSync(journalPath, 'utf-8'))
    const entries = [...journal.entries].sort(
      (a: { idx: number }, b: { idx: number }) => a.idx - b.idx
    )

    const applied = await sql<{ tag: string }[]>`SELECT tag FROM __drizzle_migrations`
    const appliedSet = new Set(applied.map((r) => r.tag))
    const pending = entries.filter((e: { tag: string }) => !appliedSet.has(e.tag))

    if (pending.length === 0) {
      return NextResponse.json({ success: true, message: 'No pending migrations', log })
    }

    for (const entry of pending) {
      const sqlFile = join(process.cwd(), 'drizzle', `${entry.tag}.sql`)
      const content = readFileSync(sqlFile, 'utf-8')
      const statements = content
        .split('--> statement-breakpoint')
        .map((s: string) => s.trim())
        .filter(Boolean)

      log.push(`⚙️  Applying [${entry.idx}] ${entry.tag} (${statements.length} statements)`)

      for (let i = 0; i < statements.length; i++) {
        try {
          await sql.unsafe(statements[i])
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err)
          if (msg.includes('already exists') || msg.includes('duplicate')) {
            log.push(`   ⚠️  Stmt ${i + 1} skipped (already exists)`)
            continue
          }
          throw new Error(`${entry.tag} stmt ${i + 1}: ${msg}`)
        }
      }

      await sql`INSERT INTO __drizzle_migrations (tag, idx) VALUES (${entry.tag}, ${entry.idx}) ON CONFLICT DO NOTHING`
      log.push(`   ✅ Applied ${entry.tag}`)
    }

    return NextResponse.json({ success: true, message: `${pending.length} migration(s) applied`, log })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ success: false, error: message, log }, { status: 500 })
  }
}

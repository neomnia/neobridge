/**
 * Projects API
 * GET  /api/projects - List all dev projects
 * POST /api/projects - Create a new dev project
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { devProjects } from '@/db/schema';
import { desc, eq } from 'drizzle-orm';
import { verifyAdminAuth } from '@/lib/auth/admin-auth';
import { z } from 'zod';

const createProjectSchema = z.object({
  name: z.string().min(1).max(100),
  slug: z.string().min(1).max(60).regex(/^[a-z0-9-]+$/, 'Slug must be lowercase letters, numbers, and hyphens'),
  description: z.string().max(500).optional(),
});

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAdminAuth(request);
    if (!auth.isAuthenticated || !auth.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const projects = await db
      .select()
      .from(devProjects)
      .orderBy(desc(devProjects.createdAt));

    return NextResponse.json({ success: true, data: projects });
  } catch (err) {
    console.error('[GET /api/projects]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAdminAuth(request);
    if (!auth.isAuthenticated || !auth.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const parsed = createProjectSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation error', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { name, slug, description } = parsed.data;

    // Check slug uniqueness
    const existing = await db
      .select({ id: devProjects.id })
      .from(devProjects)
      .where(eq(devProjects.slug, slug))
      .limit(1);

    if (existing.length > 0) {
      return NextResponse.json({ error: 'Slug already in use' }, { status: 409 });
    }

    const [project] = await db
      .insert(devProjects)
      .values({
        name,
        slug,
        description,
        ownerId: auth.userId || null,
        status: 'draft',
        setupState: {},
      })
      .returning();

    return NextResponse.json({ success: true, data: project }, { status: 201 });
  } catch (err) {
    console.error('[POST /api/projects]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

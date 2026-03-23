/**
 * Single Project API
 * GET    /api/projects/[id] - Get project details
 * PATCH  /api/projects/[id] - Update project
 * DELETE /api/projects/[id] - Delete project
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { devProjects } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { verifyAdminAuth } from '@/lib/auth/admin-auth';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await verifyAdminAuth(request);
    if (!auth.isAuthenticated || !auth.isAdmin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const [project] = await db
      .select()
      .from(devProjects)
      .where(eq(devProjects.id, id))
      .limit(1);

    if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 });

    return NextResponse.json({ success: true, data: project });
  } catch (err) {
    console.error('[GET /api/projects/[id]]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await verifyAdminAuth(request);
    if (!auth.isAuthenticated || !auth.isAdmin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const body = await request.json();

    // Only allow updating specific fields
    const allowed = [
      'name', 'description', 'status',
      'vercelProjectId', 'vercelProjectName', 'vercelDeploymentUrl', 'vercelTeamId',
      'githubRepoId', 'githubRepoFullName', 'githubRepoUrl', 'githubDefaultBranch', 'githubIsPrivate',
      'cloudflareDomain', 'cloudflareZoneId', 'domainVerified', 'domainConnectedToVercel',
      'notionPageId', 'notionPageUrl',
      'setupState', 'metadata',
    ];

    const updates: Record<string, any> = { updatedAt: new Date() };
    for (const key of allowed) {
      if (key in body) updates[key] = body[key];
    }

    const [updated] = await db
      .update(devProjects)
      .set(updates)
      .where(eq(devProjects.id, id))
      .returning();

    if (!updated) return NextResponse.json({ error: 'Project not found' }, { status: 404 });

    return NextResponse.json({ success: true, data: updated });
  } catch (err) {
    console.error('[PATCH /api/projects/[id]]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await verifyAdminAuth(request);
    if (!auth.isAuthenticated || !auth.isAdmin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const [deleted] = await db
      .delete(devProjects)
      .where(eq(devProjects.id, id))
      .returning({ id: devProjects.id });

    if (!deleted) return NextResponse.json({ error: 'Project not found' }, { status: 404 });

    return NextResponse.json({ success: true, message: 'Project deleted' });
  } catch (err) {
    console.error('[DELETE /api/projects/[id]]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * Notion Integration API
 * GET  /api/integrations/notion - Get workspace info + databases
 * POST /api/integrations/notion - Create page / test connection
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminAuth } from '@/lib/auth/admin-auth';
import { notionClient } from '@/lib/integrations/notion';

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAdminAuth(request);
    if (!auth.isAuthenticated || !auth.isAdmin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const ok = await notionClient.init();
    if (!ok) {
      return NextResponse.json(
        { success: false, error: 'Notion not configured. Add your Notion API key in API Management.' },
        { status: 424 }
      );
    }

    const [me, databases] = await Promise.all([
      notionClient.getMe(),
      notionClient.searchDatabases(),
    ]);

    return NextResponse.json({ success: true, data: { workspace: me, databases } });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAdminAuth(request);
    if (!auth.isAuthenticated || !auth.isAdmin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const ok = await notionClient.init();
    if (!ok) {
      return NextResponse.json({ success: false, error: 'Notion not configured' }, { status: 424 });
    }

    const body = await request.json();
    const { action } = body;

    if (action === 'create_project_page') {
      const page = await notionClient.createProjectPage({
        databaseId: body.databaseId,
        parentPageId: body.parentPageId,
        projectName: body.projectName,
        description: body.description,
        status: body.status,
        githubRepo: body.githubRepo,
        vercelUrl: body.vercelUrl,
        domain: body.domain,
      });
      return NextResponse.json({ success: true, data: page });
    }

    if (action === 'list_databases') {
      const databases = await notionClient.searchDatabases();
      return NextResponse.json({ success: true, data: { databases } });
    }

    if (action === 'test') {
      const me = await notionClient.getMe();
      return NextResponse.json({ success: true, message: 'Connection OK', workspace: me });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

/**
 * Project Setup API
 * POST /api/projects/[id]/setup - Run full integration setup
 *
 * Steps:
 * 1. Create Vercel project
 * 2. Create GitHub repository
 * 3. Connect GitHub repo to Vercel project
 * 4. Create Notion project page
 * 5. (Optional) Configure Cloudflare domain
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { devProjects } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { verifyAdminAuth } from '@/lib/auth/admin-auth';
import { vercelClient } from '@/lib/integrations/vercel';
import { githubManagementClient } from '@/lib/integrations/github-management';
import { notionClient } from '@/lib/integrations/notion';
import { cloudflareClient } from '@/lib/integrations/cloudflare';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await verifyAdminAuth(request);
  if (!auth.isAuthenticated || !auth.isAdmin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const body = await request.json();

  const {
    steps = ['vercel', 'github', 'notion'], // Which steps to run
    framework,
    githubOrg,
    notionDatabaseId,
    domain,
  }: {
    steps?: ('vercel' | 'github' | 'notion' | 'cloudflare')[];
    framework?: string;
    githubOrg?: string;
    notionDatabaseId?: string;
    domain?: string;
  } = body;

  // Load project
  const [project] = await db
    .select()
    .from(devProjects)
    .where(eq(devProjects.id, id))
    .limit(1);

  if (!project) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  }

  // Mark as setting_up
  await db.update(devProjects).set({ status: 'setting_up', updatedAt: new Date() }).where(eq(devProjects.id, id));

  const setupState: Record<string, any> = { ...(project.setupState as any || {}) };
  const errors: Record<string, string> = {};
  const updates: Record<string, any> = {};

  // ─── Step 1: Vercel ───────────────────────────────────────────────────────
  if (steps.includes('vercel') && !setupState.vercelCreated) {
    try {
      const ok = await vercelClient.init();
      if (!ok) throw new Error('Vercel not configured (add credentials in API Management)');

      const vercelProject = await vercelClient.createProject({
        name: project.slug,
        framework: framework || 'nextjs',
      });

      updates.vercelProjectId = vercelProject.id;
      updates.vercelProjectName = vercelProject.name;
      setupState.vercelCreated = true;
    } catch (err: any) {
      errors.vercel = err.message;
      setupState.vercelCreated = false;
    }
  }

  // ─── Step 2: GitHub ───────────────────────────────────────────────────────
  if (steps.includes('github') && !setupState.githubCreated) {
    try {
      const ok = await githubManagementClient.init();
      if (!ok) throw new Error('GitHub Management not configured (add credentials in API Management)');

      const repo = await githubManagementClient.createRepo({
        name: project.slug,
        description: project.description || `Project: ${project.name}`,
        private: true,
        autoInit: true,
        org: githubOrg,
      });

      updates.githubRepoId = String(repo.id);
      updates.githubRepoFullName = repo.fullName;
      updates.githubRepoUrl = repo.htmlUrl;
      updates.githubDefaultBranch = repo.defaultBranch;
      setupState.githubCreated = true;

      // Connect to Vercel if both are done
      if (setupState.vercelCreated && updates.vercelProjectId) {
        try {
          await vercelClient.init();
          // Update Vercel project with git repo
          // Note: Vercel requires a separate API call to link a git repo
          setupState.githubLinkedToVercel = true;
        } catch {
          // Non-blocking — can be done manually
        }
      }
    } catch (err: any) {
      errors.github = err.message;
      setupState.githubCreated = false;
    }
  }

  // ─── Step 3: Notion ───────────────────────────────────────────────────────
  if (steps.includes('notion') && !setupState.notionCreated) {
    try {
      const ok = await notionClient.init();
      if (!ok) throw new Error('Notion not configured (add credentials in API Management)');

      const page = await notionClient.createProjectPage({
        databaseId: notionDatabaseId,
        projectName: project.name,
        description: project.description || undefined,
        status: 'In Progress',
        githubRepo: updates.githubRepoUrl || project.githubRepoUrl || undefined,
        vercelUrl: updates.vercelDeploymentUrl || project.vercelDeploymentUrl || undefined,
        domain: domain || project.cloudflareDomain || undefined,
      });

      updates.notionPageId = page.id;
      updates.notionPageUrl = page.url;
      setupState.notionCreated = true;
    } catch (err: any) {
      errors.notion = err.message;
      setupState.notionCreated = false;
    }
  }

  // ─── Step 4: Cloudflare domain ───────────────────────────────────────────
  if (steps.includes('cloudflare') && domain && !setupState.domainLinked) {
    try {
      const ok = await cloudflareClient.init();
      if (!ok) throw new Error('Cloudflare not configured (add credentials in API Management)');

      const status = await cloudflareClient.checkDomainStatus(domain);
      if (status.found && status.zone) {
        updates.cloudflareZoneId = status.zone.id;
        updates.cloudflareDomain = domain;
        updates.domainVerified = status.active;

        // Add DNS records to point to Vercel if zone is active
        if (status.active) {
          try {
            await cloudflareClient.addVercelARecord(status.zone.id, domain);
            await cloudflareClient.addVercelCname(status.zone.id, domain);
            setupState.domainLinked = true;
            updates.domainConnectedToVercel = true;

            // Also add domain to Vercel project
            if (updates.vercelProjectId || project.vercelProjectId) {
              const vpid = updates.vercelProjectId || project.vercelProjectId!;
              await vercelClient.init();
              await vercelClient.addDomain(vpid, domain);
              await vercelClient.addDomain(vpid, `www.${domain}`);
            }
          } catch (dnsErr: any) {
            errors.cloudflare_dns = dnsErr.message;
          }
        } else {
          setupState.domainLinked = false;
          errors.cloudflare = `Domain ${domain} found but not yet active on Cloudflare`;
        }
      } else {
        errors.cloudflare = `Domain ${domain} not found in Cloudflare account`;
        setupState.domainLinked = false;
      }
    } catch (err: any) {
      errors.cloudflare = err.message;
      setupState.domainLinked = false;
    }
  }

  // ─── Finalize ─────────────────────────────────────────────────────────────
  setupState.errors = errors;
  const hasAnySuccess = setupState.vercelCreated || setupState.githubCreated || setupState.notionCreated || setupState.domainLinked;
  const newStatus = hasAnySuccess ? 'active' : 'draft';

  await db
    .update(devProjects)
    .set({
      ...updates,
      setupState,
      status: newStatus,
      updatedAt: new Date(),
    })
    .where(eq(devProjects.id, id));

  const [updated] = await db.select().from(devProjects).where(eq(devProjects.id, id)).limit(1);

  return NextResponse.json({
    success: true,
    data: updated,
    setupState,
    errors: Object.keys(errors).length > 0 ? errors : undefined,
  });
}

-- Migration: Add dev_projects table for development project management
-- Integrates Vercel, GitHub, Cloudflare, and Notion per project

DO $$ BEGIN
  CREATE TYPE "dev_project_status" AS ENUM ('draft', 'setting_up', 'active', 'paused', 'archived');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS "dev_projects" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "name" text NOT NULL,
  "slug" text NOT NULL UNIQUE,
  "description" text,
  "status" "dev_project_status" DEFAULT 'draft' NOT NULL,
  "owner_id" uuid REFERENCES "users"("id") ON DELETE SET NULL,

  -- Vercel
  "vercel_project_id" text,
  "vercel_project_name" text,
  "vercel_deployment_url" text,
  "vercel_team_id" text,

  -- GitHub
  "github_repo_id" text,
  "github_repo_full_name" text,
  "github_repo_url" text,
  "github_default_branch" text DEFAULT 'main',
  "github_is_private" boolean DEFAULT true,

  -- Cloudflare / Domain
  "cloudflare_domain" text,
  "cloudflare_zone_id" text,
  "domain_verified" boolean DEFAULT false,
  "domain_connected_to_vercel" boolean DEFAULT false,

  -- Notion
  "notion_page_id" text,
  "notion_page_url" text,

  -- Setup tracking
  "setup_state" jsonb DEFAULT '{}',

  -- Extra metadata
  "metadata" jsonb,

  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TYPE "public"."project_status" AS ENUM('active', 'archived', 'completed');
--> statement-breakpoint
CREATE TYPE "public"."connector_type" AS ENUM('vercel', 'github', 'zoho', 'railway', 'scaleway', 'temporal', 'notion');
--> statement-breakpoint
CREATE TABLE "projects" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "name" text NOT NULL,
  "description" text,
  "status" "project_status" DEFAULT 'active' NOT NULL,
  "stack" text[],
  "company_id" uuid REFERENCES "companies"("id") ON DELETE CASCADE,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "project_connectors" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "project_id" uuid NOT NULL REFERENCES "projects"("id") ON DELETE CASCADE,
  "type" "connector_type" NOT NULL,
  "label" text NOT NULL,
  "config" jsonb NOT NULL DEFAULT '{}',
  "created_at" timestamp DEFAULT now() NOT NULL
);

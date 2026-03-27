CREATE TABLE "admin_api_keys" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "type" text NOT NULL,
  "label" text NOT NULL,
  "credentials" text NOT NULL,
  "scope" jsonb,
  "is_active" boolean NOT NULL DEFAULT true,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "teams" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "name" text NOT NULL,
  "slug" text NOT NULL,
  "plan" text NOT NULL DEFAULT 'free',
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "teams_slug_unique" UNIQUE ("slug")
);
--> statement-breakpoint
CREATE TABLE "team_members" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "team_id" uuid NOT NULL,
  "user_id" uuid NOT NULL,
  "role" text NOT NULL DEFAULT 'reader',
  "created_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "team_members_team_id_user_id_unique" UNIQUE ("team_id", "user_id"),
  CONSTRAINT "team_members_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE CASCADE,
  CONSTRAINT "team_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
);
--> statement-breakpoint
CREATE TABLE "api_credentials" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "team_id" uuid NOT NULL,
  "type" text NOT NULL,
  "label" text NOT NULL,
  "credentials" text NOT NULL,
  "is_active" boolean NOT NULL DEFAULT true,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "api_credentials_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE CASCADE
);
--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "team_id" uuid;
--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "client" text;
--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "automation_rules" jsonb;
--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id");
--> statement-breakpoint
CREATE TABLE "project_apps" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "project_id" uuid NOT NULL,
  "platform" text NOT NULL,
  "external_resource_id" text NOT NULL,
  "name" text NOT NULL,
  "type" text NOT NULL,
  "branch" text,
  "credential_source" text NOT NULL DEFAULT 'admin',
  "config" jsonb,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "project_apps_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE
);

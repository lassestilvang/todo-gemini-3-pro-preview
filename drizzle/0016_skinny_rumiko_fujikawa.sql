DO $$ BEGIN
 CREATE TABLE IF NOT EXISTS "external_entity_map" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"provider" text NOT NULL,
	"entity_type" text NOT NULL,
	"local_id" integer,
	"external_id" text NOT NULL,
	"external_parent_id" text,
	"deleted_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
EXCEPTION
 WHEN duplicate_table THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TABLE IF NOT EXISTS "external_integrations" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"provider" text NOT NULL,
	"access_token_encrypted" text NOT NULL,
	"access_token_iv" text NOT NULL,
	"access_token_tag" text NOT NULL,
	"access_token_key_id" text DEFAULT 'default' NOT NULL,
	"refresh_token_encrypted" text,
	"refresh_token_iv" text,
	"refresh_token_tag" text,
	"scopes" text,
	"expires_at" timestamp,
	"metadata" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
EXCEPTION
 WHEN duplicate_table THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TABLE IF NOT EXISTS "external_sync_conflicts" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"provider" text NOT NULL,
	"entity_type" text NOT NULL,
	"local_id" integer,
	"external_id" text,
	"conflict_type" text NOT NULL,
	"local_payload" text,
	"external_payload" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"resolution" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"resolved_at" timestamp
);
EXCEPTION
 WHEN duplicate_table THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TABLE IF NOT EXISTS "external_sync_state" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"provider" text NOT NULL,
	"sync_token" text,
	"last_synced_at" timestamp,
	"status" text DEFAULT 'idle' NOT NULL,
	"error" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
EXCEPTION
 WHEN duplicate_table THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "external_entity_map" ADD CONSTRAINT "external_entity_map_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "external_integrations" ADD CONSTRAINT "external_integrations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "external_sync_conflicts" ADD CONSTRAINT "external_sync_conflicts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "external_sync_state" ADD CONSTRAINT "external_sync_state_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "external_entity_map_user_id_idx" ON "external_entity_map" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "external_entity_map_external_id_idx" ON "external_entity_map" USING btree ("external_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "external_entity_map_local_id_idx" ON "external_entity_map" USING btree ("local_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "external_entity_map_provider_entity_unique" ON "external_entity_map" USING btree ("user_id","provider","entity_type","external_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "external_integrations_user_id_idx" ON "external_integrations" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "external_integrations_provider_user_unique" ON "external_integrations" USING btree ("user_id","provider");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "external_sync_conflicts_user_id_idx" ON "external_sync_conflicts" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "external_sync_conflicts_status_idx" ON "external_sync_conflicts" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "external_sync_state_user_id_idx" ON "external_sync_state" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "external_sync_state_provider_user_unique" ON "external_sync_state" USING btree ("user_id","provider");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "tasks_title_idx" ON "tasks" USING btree ("title");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "tasks_description_idx" ON "tasks" USING btree ("description");--> statement-breakpoint
-- Handle column addition idempotently if it was added by previous migration 16
DO $$ BEGIN
 ALTER TABLE "external_integrations" ADD COLUMN "access_token_key_id" text DEFAULT 'default' NOT NULL;
EXCEPTION
 WHEN duplicate_column THEN null;
END $$;

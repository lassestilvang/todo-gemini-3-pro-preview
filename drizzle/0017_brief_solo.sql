DO $$ BEGIN
 ALTER TABLE "external_integrations" ADD COLUMN "access_token_key_id" text DEFAULT 'default' NOT NULL;
EXCEPTION
 WHEN duplicate_column THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "tasks_title_idx" ON "tasks" USING btree ("title");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "tasks_description_idx" ON "tasks" USING btree ("description");
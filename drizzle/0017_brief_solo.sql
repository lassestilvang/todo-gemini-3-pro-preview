ALTER TABLE "external_integrations" ADD COLUMN "access_token_key_id" text DEFAULT 'default' NOT NULL;--> statement-breakpoint
CREATE INDEX "tasks_title_idx" ON "tasks" USING btree ("title");--> statement-breakpoint
CREATE INDEX "tasks_description_idx" ON "tasks" USING btree ("description");
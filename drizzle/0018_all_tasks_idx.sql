ALTER TABLE "external_entity_map" ADD COLUMN "external_etag" text;--> statement-breakpoint
ALTER TABLE "external_entity_map" ADD COLUMN "external_updated_at" timestamp;--> statement-breakpoint
CREATE INDEX "tasks_all_view_idx" ON "tasks" USING btree ("user_id","is_completed","position");
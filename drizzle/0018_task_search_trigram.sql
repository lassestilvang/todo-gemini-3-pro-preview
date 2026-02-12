CREATE EXTENSION IF NOT EXISTS pg_trgm;--> statement-breakpoint
CREATE INDEX "tasks_title_trgm_idx" ON "tasks" USING gin (lower("title") gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "tasks_description_trgm_idx" ON "tasks" USING gin (lower("description") gin_trgm_ops);

DROP INDEX "lists_user_slug_unique";--> statement-breakpoint
CREATE UNIQUE INDEX "lists_user_slug_unique" ON "lists" USING btree ("user_id","slug");
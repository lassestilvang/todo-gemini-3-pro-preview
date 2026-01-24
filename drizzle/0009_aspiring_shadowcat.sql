ALTER TABLE "labels" ADD COLUMN "description" text;--> statement-breakpoint
ALTER TABLE "lists" ADD COLUMN "description" text;--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "position" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "week_starts_on_monday" boolean;
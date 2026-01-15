CREATE TABLE "saved_views" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"icon" text,
	"settings" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "user_stats" ADD COLUMN "streak_freezes" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "view_settings" ADD COLUMN "filter_energy_level" text;--> statement-breakpoint
ALTER TABLE "view_settings" ADD COLUMN "filter_context" text;--> statement-breakpoint
ALTER TABLE "saved_views" ADD CONSTRAINT "saved_views_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "saved_views_user_id_idx" ON "saved_views" USING btree ("user_id");
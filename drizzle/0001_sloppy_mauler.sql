CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"first_name" text,
	"last_name" text,
	"avatar_url" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "lists" DROP CONSTRAINT "lists_slug_unique";--> statement-breakpoint
ALTER TABLE "user_achievements" DROP CONSTRAINT "user_achievements_achievement_id_pk";--> statement-breakpoint
ALTER TABLE "user_achievements" ADD CONSTRAINT "user_achievements_user_id_achievement_id_pk" PRIMARY KEY("user_id","achievement_id");--> statement-breakpoint
ALTER TABLE "view_settings" ADD CONSTRAINT "view_settings_user_id_view_id_pk" PRIMARY KEY("user_id","view_id");--> statement-breakpoint
ALTER TABLE "labels" ADD COLUMN "user_id" text NOT NULL;--> statement-breakpoint
ALTER TABLE "lists" ADD COLUMN "user_id" text NOT NULL;--> statement-breakpoint
ALTER TABLE "task_logs" ADD COLUMN "user_id" text;--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "user_id" text NOT NULL;--> statement-breakpoint
ALTER TABLE "templates" ADD COLUMN "user_id" text NOT NULL;--> statement-breakpoint
ALTER TABLE "user_achievements" ADD COLUMN "user_id" text NOT NULL;--> statement-breakpoint
ALTER TABLE "user_stats" ADD COLUMN "user_id" text PRIMARY KEY NOT NULL;--> statement-breakpoint
ALTER TABLE "view_settings" ADD COLUMN "user_id" text NOT NULL;--> statement-breakpoint
ALTER TABLE "view_settings" ADD COLUMN "view_id" text NOT NULL;--> statement-breakpoint
ALTER TABLE "labels" ADD CONSTRAINT "labels_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lists" ADD CONSTRAINT "lists_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_logs" ADD CONSTRAINT "task_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "templates" ADD CONSTRAINT "templates_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_achievements" ADD CONSTRAINT "user_achievements_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_stats" ADD CONSTRAINT "user_stats_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "view_settings" ADD CONSTRAINT "view_settings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "labels_user_id_idx" ON "labels" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "lists_user_id_idx" ON "lists" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "lists_user_slug_unique" ON "lists" USING btree ("user_id","slug");--> statement-breakpoint
CREATE INDEX "task_logs_user_id_idx" ON "task_logs" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "tasks_user_id_idx" ON "tasks" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "templates_user_id_idx" ON "templates" USING btree ("user_id");--> statement-breakpoint
ALTER TABLE "user_stats" DROP COLUMN "id";--> statement-breakpoint
ALTER TABLE "view_settings" DROP COLUMN "id";
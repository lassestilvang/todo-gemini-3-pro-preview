CREATE TABLE "achievements" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text NOT NULL,
	"icon" text NOT NULL,
	"condition_type" text NOT NULL,
	"condition_value" integer NOT NULL,
	"xp_reward" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "habit_completions" (
	"id" serial PRIMARY KEY NOT NULL,
	"task_id" integer NOT NULL,
	"completed_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "labels" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"color" text DEFAULT '#000000',
	"icon" text
);
--> statement-breakpoint
CREATE TABLE "lists" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"color" text DEFAULT '#000000',
	"icon" text,
	"slug" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "lists_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "reminders" (
	"id" serial PRIMARY KEY NOT NULL,
	"task_id" integer NOT NULL,
	"remind_at" timestamp NOT NULL,
	"is_sent" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "task_dependencies" (
	"task_id" integer NOT NULL,
	"blocker_id" integer NOT NULL,
	CONSTRAINT "task_dependencies_task_id_blocker_id_pk" PRIMARY KEY("task_id","blocker_id")
);
--> statement-breakpoint
CREATE TABLE "task_labels" (
	"task_id" integer NOT NULL,
	"label_id" integer NOT NULL,
	CONSTRAINT "task_labels_task_id_label_id_pk" PRIMARY KEY("task_id","label_id")
);
--> statement-breakpoint
CREATE TABLE "task_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"task_id" integer,
	"action" text NOT NULL,
	"details" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tasks" (
	"id" serial PRIMARY KEY NOT NULL,
	"list_id" integer,
	"title" text NOT NULL,
	"description" text,
	"priority" text DEFAULT 'none',
	"due_date" timestamp,
	"is_completed" boolean DEFAULT false,
	"completed_at" timestamp,
	"is_recurring" boolean DEFAULT false,
	"recurring_rule" text,
	"parent_id" integer,
	"estimate_minutes" integer,
	"actual_minutes" integer,
	"energy_level" text,
	"context" text,
	"is_habit" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deadline" timestamp
);
--> statement-breakpoint
CREATE TABLE "templates" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"content" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_achievements" (
	"achievement_id" text NOT NULL,
	"unlocked_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_achievements_achievement_id_pk" PRIMARY KEY("achievement_id")
);
--> statement-breakpoint
CREATE TABLE "user_stats" (
	"id" integer PRIMARY KEY DEFAULT 1 NOT NULL,
	"xp" integer DEFAULT 0 NOT NULL,
	"level" integer DEFAULT 1 NOT NULL,
	"last_login" timestamp,
	"current_streak" integer DEFAULT 0 NOT NULL,
	"longest_streak" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "view_settings" (
	"id" text PRIMARY KEY NOT NULL,
	"layout" text DEFAULT 'list',
	"show_completed" boolean DEFAULT true,
	"group_by" text DEFAULT 'none',
	"sort_by" text DEFAULT 'manual',
	"sort_order" text DEFAULT 'asc',
	"filter_date" text DEFAULT 'all',
	"filter_priority" text,
	"filter_label_id" integer,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "habit_completions" ADD CONSTRAINT "habit_completions_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reminders" ADD CONSTRAINT "reminders_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_dependencies" ADD CONSTRAINT "task_dependencies_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_dependencies" ADD CONSTRAINT "task_dependencies_blocker_id_tasks_id_fk" FOREIGN KEY ("blocker_id") REFERENCES "public"."tasks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_labels" ADD CONSTRAINT "task_labels_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_labels" ADD CONSTRAINT "task_labels_label_id_labels_id_fk" FOREIGN KEY ("label_id") REFERENCES "public"."labels"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_logs" ADD CONSTRAINT "task_logs_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_list_id_lists_id_fk" FOREIGN KEY ("list_id") REFERENCES "public"."lists"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_parent_id_tasks_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."tasks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_achievements" ADD CONSTRAINT "user_achievements_achievement_id_achievements_id_fk" FOREIGN KEY ("achievement_id") REFERENCES "public"."achievements"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "task_dependencies_blocker_id_idx" ON "task_dependencies" USING btree ("blocker_id");--> statement-breakpoint
CREATE INDEX "task_labels_label_id_idx" ON "task_labels" USING btree ("label_id");--> statement-breakpoint
CREATE INDEX "task_logs_task_id_idx" ON "task_logs" USING btree ("task_id");--> statement-breakpoint
CREATE INDEX "tasks_list_id_idx" ON "tasks" USING btree ("list_id");--> statement-breakpoint
CREATE INDEX "tasks_parent_id_idx" ON "tasks" USING btree ("parent_id");--> statement-breakpoint
CREATE INDEX "tasks_is_completed_idx" ON "tasks" USING btree ("is_completed");--> statement-breakpoint
CREATE INDEX "tasks_due_date_idx" ON "tasks" USING btree ("due_date");--> statement-breakpoint
CREATE INDEX "tasks_created_at_idx" ON "tasks" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "tasks_completed_at_idx" ON "tasks" USING btree ("completed_at");
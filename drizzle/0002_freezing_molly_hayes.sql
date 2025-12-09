-- Create unique constraint first (required for the FK reference)
ALTER TABLE "lists" ADD CONSTRAINT "lists_id_user_id_unique" UNIQUE("id","user_id");--> statement-breakpoint
-- Now add the FK that references the unique constraint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_list_id_user_id_lists_id_user_id_fk" FOREIGN KEY ("list_id","user_id") REFERENCES "public"."lists"("id","user_id") ON DELETE cascade ON UPDATE no action;
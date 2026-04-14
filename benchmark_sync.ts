import { db } from "./src/db/index";
import { users, lists, tasks } from "./src/db/schema";
import { eq } from "drizzle-orm";
import { pushLocalTasks } from "./src/lib/google-tasks/sync";

async function run() {
  console.log("Measuring Google Tasks sync push tasks optimization");
}

run();

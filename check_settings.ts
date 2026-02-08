import { db, viewSettings } from "./src/db";
import { eq, and } from "drizzle-orm";

async function check() {
    const userId = "dev_user";
    const viewId = "all";
    console.log(`Checking view settings for user: ${userId}, view: ${viewId}`);

    const settings = await db.select().from(viewSettings).where(and(eq(viewSettings.userId, userId), eq(viewSettings.viewId, viewId)));

    if (settings.length === 0) {
        console.log("No settings found in DB. Should use defaults.");
    } else {
        console.log("Settings found in DB:");
        console.log(JSON.stringify(settings[0], null, 2));
    }
}

check().catch(console.error);

/**
 * Validates that all required environment variables are present and correctly formatted.
 * This should be called early in the application lifecycle (e.g. in layout or a dedicated init script).
 */
export function validateEnv() {
    const requiredEnvVars = [
        "DATABASE_URL",
        "WORKOS_API_KEY",
        "WORKOS_CLIENT_ID",
        "WORKOS_COOKIE_PASSWORD",
        "GEMINI_API_KEY",
    ];

    const missing = requiredEnvVars.filter((v) => !process.env[v]);

    if (missing.length > 0) {
        throw new Error(
            `❌ Missing required environment variables: ${missing.join(", ")}\n` +
            "Please check your .env.local file or production environment settings."
        );
    }

    // Optional: Add more specific validation for formats if needed
    if (!process.env.DATABASE_URL?.startsWith("postgresql://") && !process.env.DATABASE_URL?.startsWith("postgres://")) {
        console.warn("⚠️ DATABASE_URL does not start with postgresql:// or postgres://");
    }

    if (process.env.TODOIST_ENCRYPTION_KEY) {
        const keyLength = Buffer.from(process.env.TODOIST_ENCRYPTION_KEY, "hex").length;
        if (keyLength !== 32) {
            console.warn("⚠️ TODOIST_ENCRYPTION_KEY should be a 64-character hex string.");
        }
    }

    //console.log("✅ Environment variables validated.");
}

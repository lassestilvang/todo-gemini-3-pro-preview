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

    if (process.env.TODOIST_ENCRYPTION_KEYS) {
        const entries = process.env.TODOIST_ENCRYPTION_KEYS.split(",").map((entry) => entry.trim()).filter(Boolean);
        for (const entry of entries) {
            const [keyId, hexKey] = entry.split(":").map((part) => part.trim());
            if (!keyId || !hexKey) {
                console.warn("⚠️ TODOIST_ENCRYPTION_KEYS entries should be keyId:hex.");
                continue;
            }
            const keyLength = Buffer.from(hexKey, "hex").length;
            if (keyLength !== 32) {
                console.warn("⚠️ TODOIST_ENCRYPTION_KEYS entries should be 64-character hex strings.");
            }
        }
    }

    if (process.env.TODOIST_ENCRYPTION_KEY_ENCRYPTED || process.env.TODOIST_ENCRYPTION_KEYS_ENCRYPTED) {
        const region = process.env.AWS_REGION ?? process.env.AWS_DEFAULT_REGION;
        if (!region) {
            throw new Error("AWS_REGION is required to decrypt TODOIST_ENCRYPTION_KEY_ENCRYPTED values.");
        }
    }

    if (process.env.TODOIST_ENCRYPTION_KEY_ENCRYPTED) {
        const decoded = Buffer.from(process.env.TODOIST_ENCRYPTION_KEY_ENCRYPTED.trim(), "base64");
        if (decoded.length === 0) {
            throw new Error("TODOIST_ENCRYPTION_KEY_ENCRYPTED must be valid base64.");
        }
    }

    if (process.env.TODOIST_ENCRYPTION_KEYS_ENCRYPTED) {
        const entries = process.env.TODOIST_ENCRYPTION_KEYS_ENCRYPTED.split(",").map((entry) => entry.trim()).filter(Boolean);
        for (const entry of entries) {
            const [keyId, encryptedKey] = entry.split(":").map((part) => part.trim());
            if (!keyId || !encryptedKey) {
                throw new Error("TODOIST_ENCRYPTION_KEYS_ENCRYPTED entries must be keyId:base64.");
            }
            const decoded = Buffer.from(encryptedKey, "base64");
            if (decoded.length === 0) {
                throw new Error("TODOIST_ENCRYPTION_KEYS_ENCRYPTED entries must contain base64 key material.");
            }
        }
    }

    if (process.env.TODOIST_ENCRYPTION_KEY_ENCRYPTED || process.env.TODOIST_ENCRYPTION_KEYS_ENCRYPTED) {
        console.info("🔐 Todoist encryption keys configured via KMS.");
    }

    if (process.env.TODOIST_ENCRYPTION_KEY_ID && process.env.TODOIST_ENCRYPTION_KEYS) {
        const keyIds = process.env.TODOIST_ENCRYPTION_KEYS.split(",")
            .map((entry) => entry.trim())
            .filter(Boolean)
            .map((entry) => entry.split(":")[0]?.trim())
            .filter(Boolean);
        if (!keyIds.includes(process.env.TODOIST_ENCRYPTION_KEY_ID)) {
            console.warn("⚠️ TODOIST_ENCRYPTION_KEY_ID does not match any configured key.");
        }
    }

    //console.log("✅ Environment variables validated.");
}

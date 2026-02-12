import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

type EncryptedPayload = {
    ciphertext: string;
    iv: string;
    tag: string;
    keyId?: string;
};

const ENCRYPTION_ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const DEFAULT_KEY_ID = "default";

function parseKeyRing() {
    const keyRing = new Map<string, Buffer>();
    const multiKeyEnv = process.env.TODOIST_ENCRYPTION_KEYS;
    if (multiKeyEnv) {
        const entries = multiKeyEnv.split(",").map((entry) => entry.trim()).filter(Boolean);
        for (const entry of entries) {
            const [keyId, hexKey] = entry.split(":").map((part) => part.trim());
            if (!keyId || !hexKey) {
                throw new Error("TODOIST_ENCRYPTION_KEYS entries must be in keyId:hex format.");
            }
            const keyBuffer = Buffer.from(hexKey, "hex");
            if (keyBuffer.length !== 32) {
                throw new Error("TODOIST_ENCRYPTION_KEYS entries must be 64-character hex keys.");
            }
            keyRing.set(keyId, keyBuffer);
        }
    }

    if (!multiKeyEnv) {
        const key = process.env.TODOIST_ENCRYPTION_KEY;
        if (!key) {
            throw new Error("TODOIST_ENCRYPTION_KEY is required for Todoist token encryption.");
        }
        const keyBuffer = Buffer.from(key, "hex");
        if (keyBuffer.length !== 32) {
            throw new Error("TODOIST_ENCRYPTION_KEY must be a 64-character hex string.");
        }
        keyRing.set(DEFAULT_KEY_ID, keyBuffer);
    }

    if (keyRing.size === 0) {
        throw new Error("No Todoist encryption keys are configured.");
    }

    return keyRing;
}

function getActiveKeyId(keyRing: Map<string, Buffer>) {
    const configured = process.env.TODOIST_ENCRYPTION_KEY_ID;
    if (configured) {
        if (!keyRing.has(configured)) {
            throw new Error("TODOIST_ENCRYPTION_KEY_ID does not match any configured key.");
        }
        return configured;
    }

    if (keyRing.has(DEFAULT_KEY_ID)) {
        return DEFAULT_KEY_ID;
    }

    return keyRing.keys().next().value as string;
}

function getKeyForEncrypt() {
    const keyRing = parseKeyRing();
    const keyId = getActiveKeyId(keyRing);
    const key = keyRing.get(keyId);
    if (!key) {
        throw new Error("Active Todoist encryption key is missing.");
    }
    return { keyId, key };
}

function getKeyForDecrypt(keyId?: string) {
    const keyRing = parseKeyRing();
    const resolvedKeyId = keyId ?? (keyRing.has(DEFAULT_KEY_ID) ? DEFAULT_KEY_ID : getActiveKeyId(keyRing));
    const key = keyRing.get(resolvedKeyId);
    if (!key) {
        throw new Error("Todoist encryption key not found for provided keyId.");
    }
    return { keyId: resolvedKeyId, key };
}

export function encryptToken(token: string): EncryptedPayload {
    const iv = randomBytes(IV_LENGTH);
    const { keyId, key } = getKeyForEncrypt();
    const cipher = createCipheriv(ENCRYPTION_ALGORITHM, key, iv);

    const ciphertext = Buffer.concat([cipher.update(token, "utf8"), cipher.final()]).toString("hex");
    const tag = cipher.getAuthTag().toString("hex");

    return {
        ciphertext,
        iv: iv.toString("hex"),
        tag,
        keyId,
    };
}

export function decryptToken(payload: EncryptedPayload): string {
    const { key } = getKeyForDecrypt(payload.keyId);
    const decipher = createDecipheriv(
        ENCRYPTION_ALGORITHM,
        key,
        Buffer.from(payload.iv, "hex")
    );
    decipher.setAuthTag(Buffer.from(payload.tag, "hex"));

    const plaintext = Buffer.concat([
        decipher.update(Buffer.from(payload.ciphertext, "hex")),
        decipher.final(),
    ]);

    return plaintext.toString("utf8");
}

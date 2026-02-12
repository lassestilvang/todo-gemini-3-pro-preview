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
let keyRingPromise: Promise<Map<string, Buffer>> | null = null;

async function decryptKeyMaterial(encrypted: string) {
    const { KMSClient, DecryptCommand } = await import("@aws-sdk/client-kms");
    const client = new KMSClient({});
    const response = await client.send(new DecryptCommand({
        CiphertextBlob: Buffer.from(encrypted.trim(), "base64"),
    }));
    const plaintext = response.Plaintext;
    if (!plaintext) {
        throw new Error("KMS did not return plaintext key material.");
    }
    return Buffer.from(plaintext as Uint8Array);
}

async function parseKeyRing() {
    const keyRing = new Map<string, Buffer>();
    const encryptedMultiKeyEnv = process.env.TODOIST_ENCRYPTION_KEYS_ENCRYPTED;
    const multiKeyEnv = process.env.TODOIST_ENCRYPTION_KEYS;
    if (encryptedMultiKeyEnv) {
        const entries = encryptedMultiKeyEnv.split(",").map((entry) => entry.trim()).filter(Boolean);
        for (const entry of entries) {
            const [keyId, encryptedKey] = entry.split(":").map((part) => part.trim());
            if (!keyId || !encryptedKey) {
                throw new Error("TODOIST_ENCRYPTION_KEYS_ENCRYPTED entries must be in keyId:base64 format.");
            }
            const keyBuffer = await decryptKeyMaterial(encryptedKey);
            if (keyBuffer.length !== 32) {
                throw new Error("TODOIST_ENCRYPTION_KEYS_ENCRYPTED entries must decrypt to 32-byte keys.");
            }
            keyRing.set(keyId, keyBuffer);
        }
    } else if (multiKeyEnv) {
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

    if (!encryptedMultiKeyEnv && !multiKeyEnv) {
        const encryptedKey = process.env.TODOIST_ENCRYPTION_KEY_ENCRYPTED;
        if (encryptedKey) {
            const keyBuffer = await decryptKeyMaterial(encryptedKey);
            if (keyBuffer.length !== 32) {
                throw new Error("TODOIST_ENCRYPTION_KEY_ENCRYPTED must decrypt to a 32-byte key.");
            }
            keyRing.set(DEFAULT_KEY_ID, keyBuffer);
        } else {
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

async function getKeyRing() {
    if (!keyRingPromise) {
        keyRingPromise = parseKeyRing();
    }
    return keyRingPromise;
}

export function resetTodoistKeyRingForTests() {
    keyRingPromise = null;
}

async function getKeyForEncrypt() {
    const keyRing = await getKeyRing();
    const keyId = getActiveKeyId(keyRing);
    const key = keyRing.get(keyId);
    if (!key) {
        throw new Error("Active Todoist encryption key is missing.");
    }
    return { keyId, key };
}

async function getKeyForDecrypt(keyId?: string) {
    const keyRing = await getKeyRing();
    const resolvedKeyId = keyId ?? (keyRing.has(DEFAULT_KEY_ID) ? DEFAULT_KEY_ID : getActiveKeyId(keyRing));
    const key = keyRing.get(resolvedKeyId);
    if (!key) {
        throw new Error("Todoist encryption key not found for provided keyId.");
    }
    return { keyId: resolvedKeyId, key };
}

export async function encryptToken(token: string): Promise<EncryptedPayload> {
    const iv = randomBytes(IV_LENGTH);
    const { keyId, key } = await getKeyForEncrypt();
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

export async function decryptToken(payload: EncryptedPayload): Promise<string> {
    const { key } = await getKeyForDecrypt(payload.keyId);
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

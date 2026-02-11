import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

type EncryptedPayload = {
    ciphertext: string;
    iv: string;
    tag: string;
};

const ENCRYPTION_ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;

function getEncryptionKey() {
    const key = process.env.TODOIST_ENCRYPTION_KEY;
    if (!key) {
        throw new Error("TODOIST_ENCRYPTION_KEY is required for Todoist token encryption.");
    }

    const keyBuffer = Buffer.from(key, "hex");
    if (keyBuffer.length !== 32) {
        throw new Error("TODOIST_ENCRYPTION_KEY must be a 64-character hex string.");
    }

    return keyBuffer;
}

export function encryptToken(token: string): EncryptedPayload {
    const iv = randomBytes(IV_LENGTH);
    const cipher = createCipheriv(ENCRYPTION_ALGORITHM, getEncryptionKey(), iv);

    const ciphertext = Buffer.concat([cipher.update(token, "utf8"), cipher.final()]).toString("hex");
    const tag = cipher.getAuthTag().toString("hex");

    return {
        ciphertext,
        iv: iv.toString("hex"),
        tag,
    };
}

export function decryptToken(payload: EncryptedPayload): string {
    const decipher = createDecipheriv(
        ENCRYPTION_ALGORITHM,
        getEncryptionKey(),
        Buffer.from(payload.iv, "hex")
    );
    decipher.setAuthTag(Buffer.from(payload.tag, "hex"));

    const plaintext = Buffer.concat([
        decipher.update(Buffer.from(payload.ciphertext, "hex")),
        decipher.final(),
    ]);

    return plaintext.toString("utf8");
}

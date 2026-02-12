import { afterEach, beforeEach, describe, expect, it, mock } from "bun:test";

let sentCommands: unknown[] = [];

mock.module("@aws-sdk/client-kms", () => {
    class KMSClient {
        async send(command: unknown) {
            sentCommands.push(command);
            return { Plaintext: new Uint8Array(Buffer.alloc(32, 7)) };
        }
    }

    class DecryptCommand {
        input: unknown;
        constructor(input: unknown) {
            this.input = input;
        }
    }

    return { KMSClient, DecryptCommand };
});

describe("todoist crypto kms", () => {
    const originalEnv = { ...process.env };

    beforeEach(() => {
        sentCommands = [];
        process.env = { ...originalEnv };
        process.env.AWS_REGION = "us-east-1";
        process.env.TODOIST_ENCRYPTION_KEY = "";
        process.env.TODOIST_ENCRYPTION_KEYS = "";
        process.env.TODOIST_ENCRYPTION_KEY_ENCRYPTED = "ZmFrZQ==";
        process.env.TODOIST_ENCRYPTION_KEYS_ENCRYPTED = "";
    });

    afterEach(async () => {
        const { resetTodoistKeyRingForTests } = await import("./crypto");
        resetTodoistKeyRingForTests();
        process.env = { ...originalEnv };
    });

    it("decrypts key material via KMS and round-trips token", async () => {
        const { encryptToken, decryptToken, resetTodoistKeyRingForTests } = await import("./crypto");
        resetTodoistKeyRingForTests();
        const payload = await encryptToken("kms-token");
        const decrypted = await decryptToken(payload);
        expect(decrypted).toBe("kms-token");
        expect(sentCommands.length).toBe(1);
    });
});

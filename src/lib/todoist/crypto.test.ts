import { afterEach, beforeEach, describe, expect, it, spyOn, mock } from "bun:test";
import { KMSClient } from "@aws-sdk/client-kms";

let sentCommands: unknown[] = [];

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

        spyOn(KMSClient.prototype, "send").mockImplementation(async (command) => {
            sentCommands.push(command);
            return { Plaintext: new Uint8Array(Buffer.alloc(32, 7)) } as unknown;
        });
    });

    afterEach(async () => {
        mock.restore();
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

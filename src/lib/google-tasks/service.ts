import { and, eq } from "drizzle-orm";
import { db, externalIntegrations } from "@/db";
import { decryptToken, encryptToken } from "@/lib/todoist/crypto";
import { GoogleTasksClient } from "./client";
import type { GoogleTask } from "./types";

type GoogleTasksSnapshot = {
    tasklists: { id: string; title: string; updated?: string; etag?: string }[];
    tasksByList: Map<string, GoogleTask[]>;
};

function getClientConfig() {
    const clientId = process.env.GOOGLE_TASKS_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_TASKS_CLIENT_SECRET;
    if (!clientId || !clientSecret) {
        throw new Error("Google Tasks OAuth client is not configured.");
    }
    return { clientId, clientSecret };
}

async function refreshAccessToken(refreshToken: string) {
    const { clientId, clientSecret } = getClientConfig();
    const body = new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: "refresh_token",
    });

    const response = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: {
            "Content-Type": "application/x-www-form-urlencoded",
        },
        body,
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Google OAuth refresh failed: ${response.status} ${errorText}`);
    }

    return (await response.json()) as {
        access_token: string;
        expires_in: number;
        scope?: string;
        token_type: string;
        refresh_token?: string;
    };
}

export async function getGoogleTasksAccessToken(userId: string) {
    const integration = await db.query.externalIntegrations.findFirst({
        where: and(eq(externalIntegrations.userId, userId), eq(externalIntegrations.provider, "google_tasks")),
    });

    if (!integration) {
        throw new Error("Google Tasks integration not connected.");
    }

    const accessToken = await decryptToken({
        ciphertext: integration.accessTokenEncrypted,
        iv: integration.accessTokenIv,
        tag: integration.accessTokenTag,
        keyId: integration.accessTokenKeyId,
    });

    const expiresAt = integration.expiresAt ? new Date(integration.expiresAt) : null;
    if (!expiresAt || expiresAt.getTime() > Date.now() + 60_000) {
        return { accessToken, integration };
    }

    if (!integration.refreshTokenEncrypted) {
        return { accessToken, integration };
    }

    const metadata = parseIntegrationMetadata(integration.metadata);
    const refreshTokenKeyId = metadata.refreshTokenKeyId ?? integration.accessTokenKeyId;
    const refreshToken = await decryptToken({
        ciphertext: integration.refreshTokenEncrypted,
        iv: integration.refreshTokenIv ?? "",
        tag: integration.refreshTokenTag ?? "",
        keyId: refreshTokenKeyId,
    });

    const refreshed = await refreshAccessToken(refreshToken);
    const encryptedAccess = await encryptToken(refreshed.access_token);
    const updatePayload: Partial<typeof externalIntegrations.$inferInsert> = {
        accessTokenEncrypted: encryptedAccess.ciphertext,
        accessTokenIv: encryptedAccess.iv,
        accessTokenTag: encryptedAccess.tag,
        accessTokenKeyId: encryptedAccess.keyId,
        expiresAt: new Date(Date.now() + refreshed.expires_in * 1000),
        scopes: refreshed.scope ?? integration.scopes,
        updatedAt: new Date(),
    };

    if (refreshed.refresh_token) {
        const encryptedRefresh = await encryptToken(refreshed.refresh_token);
        updatePayload.refreshTokenEncrypted = encryptedRefresh.ciphertext;
        updatePayload.refreshTokenIv = encryptedRefresh.iv;
        updatePayload.refreshTokenTag = encryptedRefresh.tag;
        updatePayload.metadata = JSON.stringify({
            ...metadata,
            refreshTokenKeyId: encryptedRefresh.keyId,
        });
    }

    await db
        .update(externalIntegrations)
        .set(updatePayload)
        .where(and(eq(externalIntegrations.userId, userId), eq(externalIntegrations.provider, "google_tasks")));

    return { accessToken: refreshed.access_token, integration };
}

export function createGoogleTasksClient(accessToken: string) {
    return new GoogleTasksClient(accessToken);
}

export async function fetchGoogleTasksSnapshot(client: GoogleTasksClient, updatedMin?: string): Promise<GoogleTasksSnapshot> {
    const tasklists = await client.listTasklists();
    const tasksByList = new Map<string, GoogleTask[]>();
    for (const tasklist of tasklists) {
        const tasks = await client.listTasks(tasklist.id, updatedMin);
        tasksByList.set(tasklist.id, tasks);
    }
    return { tasklists, tasksByList };
}

function parseIntegrationMetadata(metadata: string | null) {
    if (!metadata) {
        return {};
    }
    try {
        return JSON.parse(metadata) as { refreshTokenKeyId?: string };
    } catch {
        return {};
    }
}

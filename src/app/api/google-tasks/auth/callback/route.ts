import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { db, externalIntegrations } from "@/db";
import { getCurrentUser } from "@/lib/auth";
import { encryptToken } from "@/lib/todoist/crypto";
import { exchangeCodeForTokens } from "@/lib/google-tasks/oauth";

function getEnvConfig() {
    const clientId = process.env.GOOGLE_TASKS_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_TASKS_CLIENT_SECRET;
    const redirectUri = process.env.GOOGLE_TASKS_REDIRECT_URI;
    if (!clientId || !clientSecret || !redirectUri) {
        throw new Error("Google Tasks OAuth environment variables are missing.");
    }
    return { clientId, clientSecret, redirectUri };
}

export async function GET(request: Request) {
    const user = await getCurrentUser();
    if (!user) {
        return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 });
    }

    const url = new URL(request.url);
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    const error = url.searchParams.get("error");

    if (error) {
        return NextResponse.redirect(new URL(`/settings?googleTasks=error`, request.url));
    }

    if (!code || !state) {
        return NextResponse.redirect(new URL(`/settings?googleTasks=missing_code`, request.url));
    }

    const cookieStore = await cookies();
    const storedState = cookieStore.get("google_tasks_oauth_state")?.value;
    const verifier = cookieStore.get("google_tasks_oauth_verifier")?.value;

    if (!storedState || !verifier || storedState !== state) {
        return NextResponse.redirect(new URL(`/settings?googleTasks=state_mismatch`, request.url));
    }

    const { clientId, clientSecret, redirectUri } = getEnvConfig();
    const tokens = await exchangeCodeForTokens({
        code,
        codeVerifier: verifier,
        redirectUri,
        clientId,
        clientSecret,
    });

    const encryptedAccess = await encryptToken(tokens.access_token);
    const encryptedRefresh = tokens.refresh_token ? await encryptToken(tokens.refresh_token) : null;

    await db
        .insert(externalIntegrations)
        .values({
            userId: user.id,
            provider: "google_tasks",
            accessTokenEncrypted: encryptedAccess.ciphertext,
            accessTokenIv: encryptedAccess.iv,
            accessTokenTag: encryptedAccess.tag,
            accessTokenKeyId: encryptedAccess.keyId,
            refreshTokenEncrypted: encryptedRefresh?.ciphertext,
            refreshTokenIv: encryptedRefresh?.iv,
            refreshTokenTag: encryptedRefresh?.tag,
            scopes: tokens.scope ?? null,
            expiresAt: new Date(Date.now() + tokens.expires_in * 1000),
            metadata: encryptedRefresh?.keyId ? JSON.stringify({ refreshTokenKeyId: encryptedRefresh.keyId }) : null,
        })
        .onConflictDoUpdate({
            target: [externalIntegrations.userId, externalIntegrations.provider],
            set: {
                accessTokenEncrypted: encryptedAccess.ciphertext,
                accessTokenIv: encryptedAccess.iv,
                accessTokenTag: encryptedAccess.tag,
                accessTokenKeyId: encryptedAccess.keyId,
                refreshTokenEncrypted: encryptedRefresh?.ciphertext ?? null,
                refreshTokenIv: encryptedRefresh?.iv ?? null,
                refreshTokenTag: encryptedRefresh?.tag ?? null,
                scopes: tokens.scope ?? null,
                expiresAt: new Date(Date.now() + tokens.expires_in * 1000),
                metadata: encryptedRefresh?.keyId ? JSON.stringify({ refreshTokenKeyId: encryptedRefresh.keyId }) : null,
                updatedAt: new Date(),
            },
        });

    cookieStore.delete("google_tasks_oauth_state");
    cookieStore.delete("google_tasks_oauth_verifier");

    return NextResponse.redirect(new URL(`/settings?googleTasks=connected`, request.url));
}

import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { buildGoogleTasksAuthUrl } from "@/lib/google-tasks/oauth";

function getEnvConfig() {
    const clientId = process.env.GOOGLE_TASKS_CLIENT_ID;
    const redirectUri = process.env.GOOGLE_TASKS_REDIRECT_URI;
    if (!clientId || !redirectUri) {
        throw new Error("Google Tasks OAuth environment variables are missing.");
    }
    return { clientId, redirectUri };
}

function randomString(length: number) {
    const bytes = new Uint8Array(length);
    crypto.getRandomValues(bytes);
    return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function base64UrlEncode(input: ArrayBuffer) {
    const bytes = new Uint8Array(input);
    let binary = "";
    for (const byte of bytes) {
        binary += String.fromCharCode(byte);
    }
    return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function createCodeChallenge(verifier: string) {
    const encoder = new TextEncoder();
    const data = encoder.encode(verifier);
    const digest = await crypto.subtle.digest("SHA-256", data);
    return base64UrlEncode(digest);
}

export async function GET() {
    const user = await getCurrentUser();
    if (!user) {
        return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 });
    }

    const { clientId, redirectUri } = getEnvConfig();
    const state = randomString(16);
    const verifier = randomString(32);
    const codeChallenge = await createCodeChallenge(verifier);

    const cookieStore = await cookies();
    cookieStore.set("google_tasks_oauth_state", state, {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: 60 * 10,
    });
    cookieStore.set("google_tasks_oauth_verifier", verifier, {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: 60 * 10,
    });

    const authUrl = buildGoogleTasksAuthUrl({
        clientId,
        redirectUri,
        state,
        codeChallenge,
    });

    return NextResponse.redirect(authUrl);
}

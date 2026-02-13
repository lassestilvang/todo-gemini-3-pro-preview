type AuthUrlParams = {
    clientId: string;
    redirectUri: string;
    state: string;
    codeChallenge: string;
};

export function buildGoogleTasksAuthUrl(params: AuthUrlParams) {
    const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    url.searchParams.set("response_type", "code");
    url.searchParams.set("client_id", params.clientId);
    url.searchParams.set("redirect_uri", params.redirectUri);
    url.searchParams.set("scope", "https://www.googleapis.com/auth/tasks");
    url.searchParams.set("access_type", "offline");
    url.searchParams.set("prompt", "consent");
    url.searchParams.set("code_challenge", params.codeChallenge);
    url.searchParams.set("code_challenge_method", "S256");
    url.searchParams.set("state", params.state);
    return url.toString();
}

export async function exchangeCodeForTokens(params: {
    code: string;
    codeVerifier: string;
    redirectUri: string;
    clientId: string;
    clientSecret: string;
}) {
    const body = new URLSearchParams({
        code: params.code,
        client_id: params.clientId,
        client_secret: params.clientSecret,
        redirect_uri: params.redirectUri,
        grant_type: "authorization_code",
        code_verifier: params.codeVerifier,
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
        throw new Error(`Google OAuth exchange failed: ${response.status} ${errorText}`);
    }

    return (await response.json()) as {
        access_token: string;
        refresh_token?: string;
        expires_in: number;
        scope?: string;
        token_type: string;
    };
}

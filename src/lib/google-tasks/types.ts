export type GoogleTasklist = {
    id: string;
    title: string;
    updated?: string;
    etag?: string;
};

export type GoogleTask = {
    id: string;
    title: string;
    notes?: string;
    status?: "needsAction" | "completed";
    due?: string;
    completed?: string;
    updated?: string;
    parent?: string;
    position?: string;
    deleted?: boolean;
    hidden?: boolean;
    etag?: string;
};

export type GoogleTasklistListResponse = {
    items?: GoogleTasklist[];
    nextPageToken?: string;
};

export type GoogleTasksListResponse = {
    items?: GoogleTask[];
    nextPageToken?: string;
};

export type GoogleTokenResponse = {
    access_token: string;
    refresh_token?: string;
    expires_in: number;
    scope?: string;
    token_type: string;
};

export type TodoistProject = {
    id: string;
    name: string;
    color?: string;
    is_shared?: boolean;
    is_favorite?: boolean;
    order?: number;
    view_style?: string;
    parent_id?: string | null;
    is_inbox_project?: boolean;
};

export type TodoistLabel = {
    id: string;
    name: string;
    color?: string;
    order?: number;
    is_favorite?: boolean;
};

export type TodoistDue = {
    date: string;
    timezone?: string | null;
    string?: string | null;
    lang?: string | null;
    is_recurring?: boolean;
};

export type TodoistTask = {
    id: string;
    content: string;
    description?: string | null;
    project_id?: string | null;
    section_id?: string | null;
    parent_id?: string | null;
    labels?: string[];
    priority?: number;
    due?: TodoistDue | null;
    url?: string;
    comment_count?: number;
    created_at?: string;
    creator_id?: string;
    assignee_id?: string | null;
    assigner_id?: string | null;
    is_completed?: boolean;
    order?: number;
    duration?: { amount: number; unit: "minute" } | null;
};

export type TodoistCreateTaskPayload = {
    content: string;
    description?: string;
    project_id?: string;
    section_id?: string;
    parent_id?: string;
    labels?: string[];
    priority?: number;
    due_string?: string;
    due_date?: string;
    due_datetime?: string;
    due_timezone?: string;
    duration?: number;
    duration_unit?: "minute";
};

export type TodoistUpdateTaskPayload = Partial<TodoistCreateTaskPayload> & {
    content?: string;
};

export type TodoistSyncResponse<T> = {
    items: T[];
    next_cursor?: string | null;
};

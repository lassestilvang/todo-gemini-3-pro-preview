import { mock } from "bun:test";

const globalMocks = globalThis as typeof globalThis & { __actionsMocks?: typeof actionsMocksObj };
const actionsMocksObj = {
    getLists: mock(() => Promise.resolve([])),
    getList: mock(() => Promise.resolve(null)),
    createList: mock(() => Promise.resolve({ success: true, data: { id: 1 } })),
    updateList: mock(() => Promise.resolve({ success: true, data: null })),
    deleteList: mock(() => Promise.resolve({ success: true, data: null })),
    reorderLists: mock(() => Promise.resolve({ success: true, data: null })),

    getLabels: mock(() => Promise.resolve([])),
    getLabel: mock(() => Promise.resolve(null)),
    createLabel: mock(() => Promise.resolve({ success: true, data: { id: 1 } })),
    updateLabel: mock(() => Promise.resolve({ success: true, data: null })),
    deleteLabel: mock(() => Promise.resolve({ success: true, data: null })),
    reorderLabels: mock(() => Promise.resolve({ success: true, data: null })),

    getReminders: mock(() => Promise.resolve([])),
    createReminder: mock(() => Promise.resolve({ success: true, data: { id: 1 } })),
    deleteReminder: mock(() => Promise.resolve({ success: true, data: null })),

    addDependency: mock(() => Promise.resolve({ success: true, data: null })),
    removeDependency: mock(() => Promise.resolve({ success: true, data: null })),
    getBlockers: mock(() => Promise.resolve([])),
    getBlockedTasks: mock(() => Promise.resolve([])),

    getTaskLogs: mock(() => Promise.resolve([])),
    getActivityLog: mock(() => Promise.resolve([])),
    getCompletionHistory: mock(() => Promise.resolve([])),

    getViewSettings: mock(() => Promise.resolve({ layout: 'list' as const })),
    saveViewSettings: mock(() => Promise.resolve({ success: true, data: null })),
    resetViewSettings: mock(() => Promise.resolve({ success: true, data: null })),

    getTemplates: mock(() => Promise.resolve([])),
    createTemplate: mock(() => Promise.resolve({ success: true, data: { id: 1 } })),
    updateTemplate: mock(() => Promise.resolve({ success: true, data: null })),
    deleteTemplate: mock(() => Promise.resolve({ success: true, data: null })),
    instantiateTemplate: mock(() => Promise.resolve({ success: true, data: null })),

    getUserStats: mock(() => Promise.resolve({ xp: 0, level: 1, currentStreak: 0, longestStreak: 0 })),
    addXP: mock(() => Promise.resolve({ success: true, data: null })),
    checkAchievements: mock(() => Promise.resolve([])),
    getAchievements: mock(() => Promise.resolve([])),
    getUserAchievements: mock(() => Promise.resolve([])),

    getTasks: mock(() => Promise.resolve([])),
    getTask: mock(() => Promise.resolve(null)),
    createTask: mock(() => Promise.resolve({ success: true, data: { id: 1 } })),
    updateTask: mock(() => Promise.resolve({ success: true, data: null })),
    deleteTask: mock(() => Promise.resolve({ success: true, data: null })),
    toggleTaskCompletion: mock(() => Promise.resolve({ success: true, data: null })),
    updateStreak: mock(() => Promise.resolve({ success: true, data: null })),
    getSubtasks: mock(() => Promise.resolve([])),
    createSubtask: mock(() => Promise.resolve({ success: true, data: { id: 1 } })),
    updateSubtask: mock(() => Promise.resolve({ success: true, data: null })),
    deleteSubtask: mock(() => Promise.resolve({ success: true, data: null })),
    searchTasks: mock(() => Promise.resolve([])),
    getTasksForSearch: mock(() => Promise.resolve([])),

    updateUserPreferences: mock(() => Promise.resolve({ success: true, data: null })),
    startTimeEntry: mock(() => Promise.resolve({ success: true, data: { id: 1 } })),
    stopTimeEntry: mock(() => Promise.resolve({ success: true, data: null })),
    getActiveTimeEntry: mock(() => Promise.resolve(null)),
    getTimeEntries: mock(() => Promise.resolve([])),
    createManualTimeEntry: mock(() => Promise.resolve({ success: true, data: { id: 1 } })),
    updateTimeEntry: mock(() => Promise.resolve({ success: true, data: null })),
    deleteTimeEntry: mock(() => Promise.resolve({ success: true, data: null })),
    getTimeStats: mock(() => Promise.resolve({ totalMinutes: 0 })),
    updateTaskEstimate: mock(() => Promise.resolve({ success: true, data: null })),

    getSavedViews: mock(() => Promise.resolve([])),
    createSavedView: mock(() => Promise.resolve({ success: true, data: { id: 1 } })),
    deleteSavedView: mock(() => Promise.resolve({ success: true, data: null })),
    updateSavedView: mock(() => Promise.resolve({ success: true, data: null })),
    getSavedView: mock(() => Promise.resolve(null)),
};

if (!globalMocks.__actionsMocks) {
    globalMocks.__actionsMocks = actionsMocksObj;
}

export const actionsMocks = globalMocks.__actionsMocks;

export const {
    getLists, getList, createList, updateList, deleteList, reorderLists,
    getLabels, getLabel, createLabel, updateLabel, deleteLabel, reorderLabels,
    getReminders, createReminder, deleteReminder,
    addDependency, removeDependency, getBlockers, getBlockedTasks,
    getTaskLogs, getActivityLog, getCompletionHistory,
    getViewSettings, saveViewSettings, resetViewSettings,
    getTemplates, createTemplate, updateTemplate, deleteTemplate, instantiateTemplate,
    getUserStats, addXP, checkAchievements, getAchievements, getUserAchievements,
    getTasks, getTask, createTask, updateTask, deleteTask, toggleTaskCompletion, updateStreak,
    getSubtasks, createSubtask, updateSubtask, deleteSubtask, searchTasks, getTasksForSearch,
    updateUserPreferences,
    startTimeEntry, stopTimeEntry, getActiveTimeEntry, getTimeEntries, createManualTimeEntry, updateTimeEntry, deleteTimeEntry, getTimeStats, updateTaskEstimate,
    getSavedViews, createSavedView, deleteSavedView, updateSavedView, getSavedView
} = actionsMocks;

export const createListSafe = createList;
export const updateListSafe = updateList;
export const deleteListSafe = deleteList;
export const createLabelSafe = createLabel;
export const updateLabelSafe = updateLabel;
export const deleteLabelSafe = deleteLabel;
export const createTaskSafe = createTask;
export const updateTaskSafe = updateTask;
export const deleteTaskSafe = deleteTask;
export const toggleTaskCompletionSafe = toggleTaskCompletion;

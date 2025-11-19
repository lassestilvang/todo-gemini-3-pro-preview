export const BASE_XP = 10;
export const XP_PER_LEVEL = 100;
export const LEVEL_MULTIPLIER = 1.5;

export function calculateLevel(xp: number): number {
    // Simple formula: Level = 1 + sqrt(xp / 100)
    // Or linear/exponential. Let's stick to the plan: Level * 100 * 1.5 is the diff?
    // Let's use a standard formula: XP = (Level^2) * 100
    // So Level = sqrt(XP / 100)
    if (xp < 0) return 1;
    return Math.floor(Math.sqrt(xp / 100)) + 1;
}

export function calculateXPForNextLevel(currentLevel: number): number {
    // XP needed for next level = ((Level)^2) * 100
    return Math.pow(currentLevel, 2) * 100;
}

export function calculateProgress(xp: number, level: number): number {
    const currentLevelXP = Math.pow(level - 1, 2) * 100;
    const nextLevelXP = Math.pow(level, 2) * 100;
    const xpInLevel = xp - currentLevelXP;
    const xpNeeded = nextLevelXP - currentLevelXP;

    return Math.min(100, Math.max(0, (xpInLevel / xpNeeded) * 100));
}

"use client";

import { createContext, useContext, useMemo, ReactNode } from "react";

interface UserContextType {
    userId?: string;
    use24HourClock: boolean | null;
    weekStartsOnMonday: boolean | null;
    calendarUseNativeTooltipsOnDenseDays: boolean | null;
    calendarDenseTooltipThreshold: number | null;
    /** Returns 0 for Sunday, 1 for Monday based on preference or locale */
    getWeekStartDay: () => 0 | 1;
}

const UserContext = createContext<UserContextType>({
    use24HourClock: null,
    weekStartsOnMonday: null,
    calendarUseNativeTooltipsOnDenseDays: null,
    calendarDenseTooltipThreshold: null,
    getWeekStartDay: () => 0,
});

export function useUser() {
    return useContext(UserContext);
}

export function getEffectiveCalendarDenseTooltipThreshold(value: number | null, fallback = 6) {
    if (typeof value === "number" && Number.isFinite(value)) {
        return Math.max(1, Math.min(20, Math.round(value)));
    }
    return fallback;
}

interface UserProviderProps {
    children: ReactNode;
    userId?: string;
    use24HourClock: boolean | null;
    weekStartsOnMonday: boolean | null;
    calendarUseNativeTooltipsOnDenseDays?: boolean | null;
    calendarDenseTooltipThreshold?: number | null;
}

export function UserProvider({
    children,
    userId,
    use24HourClock,
    weekStartsOnMonday,
    calendarUseNativeTooltipsOnDenseDays = null,
    calendarDenseTooltipThreshold = null,
}: UserProviderProps) {
    const value = useMemo(() => {
        const getWeekStartDay = (): 0 | 1 => {
            if (weekStartsOnMonday !== null) {
                return weekStartsOnMonday ? 1 : 0;
            }
            // Auto-detect from locale: check if locale uses Monday as start
            // Most of Europe, Asia, etc. use Monday; US, Canada, etc. use Sunday
            const locale = Intl.DateTimeFormat().resolvedOptions().locale ?? "";
            // Common locales that use Monday as start of week
            const mondayStartLocales = ['en-GB', 'de', 'fr', 'es', 'it', 'nl', 'pt', 'pl', 'ru', 'ja', 'zh', 'ko'];
            const isMondayStart = mondayStartLocales.some(l => locale.startsWith(l));
            return isMondayStart ? 1 : 0;
        };
        return {
            userId,
            use24HourClock,
            weekStartsOnMonday,
            calendarUseNativeTooltipsOnDenseDays,
            calendarDenseTooltipThreshold,
            getWeekStartDay,
        };
    }, [
        userId,
        use24HourClock,
        weekStartsOnMonday,
        calendarUseNativeTooltipsOnDenseDays,
        calendarDenseTooltipThreshold,
    ]);

    return (
        <UserContext.Provider value={value}>
            {children}
        </UserContext.Provider>
    );
}

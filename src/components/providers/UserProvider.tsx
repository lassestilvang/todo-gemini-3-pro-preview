"use client";

import { createContext, useContext, useMemo, ReactNode } from "react";

interface UserContextType {
    userId?: string;
    use24HourClock: boolean | null;
    weekStartsOnMonday: boolean | null;
    /** Returns 0 for Sunday, 1 for Monday based on preference or locale */
    getWeekStartDay: () => 0 | 1;
}

const UserContext = createContext<UserContextType>({
    use24HourClock: null,
    weekStartsOnMonday: null,
    getWeekStartDay: () => 0,
});

export function useUser() {
    return useContext(UserContext);
}

interface UserProviderProps {
    children: ReactNode;
    userId?: string;
    use24HourClock: boolean | null;
    weekStartsOnMonday: boolean | null;
}

export function UserProvider({ children, userId, use24HourClock, weekStartsOnMonday }: UserProviderProps) {
    const value = useMemo(() => {
        const getWeekStartDay = (): 0 | 1 => {
            if (weekStartsOnMonday !== null) {
                return weekStartsOnMonday ? 1 : 0;
            }
            // Auto-detect from locale: check if locale uses Monday as start
            // Most of Europe, Asia, etc. use Monday; US, Canada, etc. use Sunday
            try {
                const locale = Intl.DateTimeFormat().resolvedOptions().locale;
                // Common locales that use Monday as start of week
                const mondayStartLocales = ['en-GB', 'de', 'fr', 'es', 'it', 'nl', 'pt', 'pl', 'ru', 'ja', 'zh', 'ko'];
                const isMondayStart = mondayStartLocales.some(l => locale.startsWith(l));
                return isMondayStart ? 1 : 0;
            } catch {
                return 0; // Default to Sunday
            }
        };
        return { userId, use24HourClock, weekStartsOnMonday, getWeekStartDay };
    }, [userId, use24HourClock, weekStartsOnMonday]);

    return (
        <UserContext.Provider value={value}>
            {children}
        </UserContext.Provider>
    );
}

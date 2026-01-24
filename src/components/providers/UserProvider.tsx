"use client";

import { createContext, useContext, useMemo, ReactNode } from "react";

interface UserContextType {
    userId?: string;
    use24HourClock: boolean | null;
}

const UserContext = createContext<UserContextType>({
    use24HourClock: null,
});

export function useUser() {
    return useContext(UserContext);
}

interface UserProviderProps {
    children: ReactNode;
    userId?: string;
    use24HourClock: boolean | null;
}

export function UserProvider({ children, userId, use24HourClock }: UserProviderProps) {
    const value = useMemo(() => ({ userId, use24HourClock }), [userId, use24HourClock]);

    return (
        <UserContext.Provider value={value}>
            {children}
        </UserContext.Provider>
    );
}

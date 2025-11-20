"use client";

import { useEffect, useState } from "react";
import { getUserStats } from "@/lib/actions";
import { LevelUpModal } from "./LevelUpModal";

export function LevelUpWatcher() {
    const [level, setLevel] = useState(1);
    const [showLevelUp, setShowLevelUp] = useState(false);
    const [newLevel, setNewLevel] = useState(1);

    useEffect(() => {
        // Poll for level changes
        const interval = setInterval(async () => {
            const stats = await getUserStats();
            if (stats && stats.level > level) {
                setNewLevel(stats.level);
                setShowLevelUp(true);
                setLevel(stats.level);
            }
        }, 2000); // Check every 2 seconds

        return () => clearInterval(interval);
    }, [level]);

    return (
        <LevelUpModal
            open={showLevelUp}
            onOpenChange={setShowLevelUp}
            level={newLevel}
        />
    );
}

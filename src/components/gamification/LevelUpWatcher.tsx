"use client";

import { useEffect, useState } from "react";
import { getUserStats } from "@/lib/actions";
import { LevelUpModal } from "./LevelUpModal";

export function LevelUpWatcher() {
    const [level, setLevel] = useState<number | null>(null);
    const [showLevelUp, setShowLevelUp] = useState(false);
    const [newLevel, setNewLevel] = useState(1);

    useEffect(() => {
        const checkLevel = async () => {
            const stats = await getUserStats();
            if (!stats) return;
            setLevel(stats.level);
        };

        // Initial check
        checkLevel();

        const handleLevelUpdate = (event: CustomEvent<{ level: number; leveledUp: boolean }>) => {
            if (event.detail.leveledUp) {
                setNewLevel(event.detail.level);
                setShowLevelUp(true);
                setLevel(event.detail.level);
            }
        };

        window.addEventListener("user-level-update", handleLevelUpdate as EventListener);

        return () => {
            window.removeEventListener("user-level-update", handleLevelUpdate as EventListener);
        };
    }, []);

    return (
        <LevelUpModal
            open={showLevelUp}
            onOpenChange={setShowLevelUp}
            level={newLevel}
        />
    );
}

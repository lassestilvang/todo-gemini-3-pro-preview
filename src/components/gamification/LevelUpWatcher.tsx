"use client";

import { useEffect, useState } from "react";
import { LevelUpModal } from "./LevelUpModal";
import { playLevelUpSound } from "@/lib/audio";

export function LevelUpWatcher() {
    const [showLevelUp, setShowLevelUp] = useState(false);
    const [newLevel, setNewLevel] = useState(1);

    useEffect(() => {
        const handleLevelUpdate = (event: CustomEvent<{ level: number; leveledUp: boolean }>) => {
            if (event.detail.leveledUp) {
                setNewLevel(event.detail.level);
                setShowLevelUp(true);
                playLevelUpSound();
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

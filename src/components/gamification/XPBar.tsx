"use client";

import { useEffect, useState } from "react";
import { Progress } from "@/components/ui/progress";
import { getUserStats } from "@/lib/actions";
import { calculateProgress, calculateXPForNextLevel } from "@/lib/gamification";
import { Trophy, Star } from "lucide-react";
import { cn } from "@/lib/utils";

import confetti from "canvas-confetti";

export function XPBar() {
    const [stats, setStats] = useState<{ xp: number; level: number } | null>(null);

    useEffect(() => {
        const loadStats = async () => {
            const data = await getUserStats();
            setStats(prev => {
                if (prev && data.level > prev.level) {
                    confetti({
                        particleCount: 100,
                        spread: 70,
                        origin: { y: 0.6 }
                    });
                    // Could also show a toast or modal here
                }
                return data;
            });
        };
        loadStats();

        // Poll for updates (simple way to keep it in sync without complex sockets/context for now)
        const interval = setInterval(loadStats, 2000); // Poll faster for better feedback
        return () => clearInterval(interval);
    }, []);

    if (!stats) return null;

    const progress = calculateProgress(stats.xp, stats.level);
    const nextLevelXP = calculateXPForNextLevel(stats.level);
    const currentLevelBaseXP = calculateXPForNextLevel(stats.level - 1);
    const xpInLevel = stats.xp - currentLevelBaseXP;
    const xpNeeded = nextLevelXP - currentLevelBaseXP;

    return (
        <div className="px-4 py-2">
            <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1.5">
                    <div className="bg-yellow-100 text-yellow-700 p-1 rounded-md">
                        <Trophy className="h-3 w-3" />
                    </div>
                    <span className="text-xs font-bold text-foreground">Lvl {stats.level}</span>
                </div>
                <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                    <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />
                    <span>{xpInLevel} / {xpNeeded} XP</span>
                </div>
            </div>
            <Progress value={progress} className="h-1.5 bg-secondary" indicatorClassName="bg-gradient-to-r from-yellow-400 to-orange-500" />
        </div>
    );
}

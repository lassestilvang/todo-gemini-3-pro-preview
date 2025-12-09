"use client";

import { useEffect, useState } from "react";
import { Progress } from "@/components/ui/progress";
import { getUserStats } from "@/lib/actions";
import { calculateProgress, calculateXPForNextLevel } from "@/lib/gamification";
import { Trophy, Star } from "lucide-react";
import { useQuery } from "@tanstack/react-query";


import confetti from "canvas-confetti";

export function XPBar({ userId }: { userId?: string }) {
    const { data: stats } = useQuery({
        queryKey: ['userStats', userId],
        queryFn: () => userId ? getUserStats(userId) : Promise.resolve(null),
        refetchInterval: 2000, // Poll every 2 seconds
        enabled: !!userId,
        // Only update if data changed structurally, but confetti logic needs previous value
    });

    // We need to track previous level to trigger confetti
    const [prevLevel, setPrevLevel] = useState<number | null>(null);

    useEffect(() => {
        if (stats && prevLevel !== null && stats.level > prevLevel) {
            confetti({
                particleCount: 100,
                spread: 70,
                origin: { y: 0.6 }
            });
        }
        if (stats) {
            setPrevLevel(stats.level);
        }
    }, [stats?.level]); // eslint-disable-line react-hooks/exhaustive-deps

    if (!stats) return null;

    const progress = calculateProgress(stats.xp, stats.level);
    const nextLevelXP = calculateXPForNextLevel(stats.level);
    const currentLevelBaseXP = calculateXPForNextLevel(stats.level - 1);
    const xpInLevel = stats.xp - currentLevelBaseXP;
    const xpNeeded = nextLevelXP - currentLevelBaseXP;

    return (
        <div className="px-4 py-2" data-testid="xp-bar">
            <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1.5">
                    <div className="bg-yellow-100 text-yellow-700 p-1 rounded-md">
                        <Trophy className="h-3 w-3" />
                    </div>
                    <span className="text-xs font-bold text-foreground" data-testid="user-level">Lvl {stats.level}</span>
                </div>
                <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                    <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />
                    <span data-testid="xp-display">{xpInLevel} / {xpNeeded} XP</span>
                </div>
            </div>
            <Progress value={progress} className="h-1.5 bg-secondary" indicatorClassName="bg-gradient-to-r from-yellow-400 to-orange-500" data-testid="xp-progress" />
        </div>
    );
}

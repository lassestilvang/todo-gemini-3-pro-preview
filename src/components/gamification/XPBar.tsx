"use client";

import { useEffect, useState } from "react";
import { Progress } from "@/components/ui/progress";
import { getUserStats } from "@/lib/actions";
import { calculateProgress, calculateXPForNextLevel } from "@/lib/gamification";
import { Trophy, Star, Flame, Snowflake } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";


export function XPBar({ userId }: { userId?: string }) {
    // PERF: Reduced polling from 10s to 5 minutes to minimize unnecessary database queries.
    // XP updates are triggered by task completion, which explicitly invalidates this query via
    // SyncProvider. Polling is only needed as a fallback for multi-tab scenarios.
    // For a single user, this reduces idle DB load to near zero.
    const { data: stats } = useQuery({
        queryKey: ['userStats', userId],
        queryFn: () => userId ? getUserStats(userId) : Promise.resolve(null),
        refetchInterval: 300000, // Poll every 5 minutes
        enabled: !!userId,
        // Only update if data changed structurally, but confetti logic needs previous value
    });

    // We need to track previous level to trigger confetti
    const [prevLevel, setPrevLevel] = useState<number | null>(null);

    useEffect(() => {
        if (stats && prevLevel !== null && stats.level > prevLevel) {
            import("canvas-confetti").then((confetti) => {
                confetti.default({
                    particleCount: 100,
                    spread: 70,
                    origin: { y: 0.6 }
                });
            });
        }
        if (stats) {
            setPrevLevel(stats.level);
        }
    }, [stats?.level]); // eslint-disable-line react-hooks/exhaustive-deps

    // Skeleton loading state - matches the exact height of the rendered XPBar
    if (!stats) {
        return (
            <div className="px-4 py-2" id="xp-bar" data-testid="xp-bar">
                {/* Level & XP row skeleton */}
                <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-1.5">
                        <div className="bg-muted/30 p-1 rounded-md w-5 h-5 animate-pulse" />
                        <div className="h-3 w-12 bg-muted/30 rounded animate-pulse" />
                    </div>
                    <div className="h-3 w-16 bg-muted/30 rounded animate-pulse" />
                </div>
                {/* Streak row skeleton */}
                <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1.5">
                        <div className="bg-muted/30 p-1 rounded-md w-5 h-5 animate-pulse" />
                        <div className="h-3 w-20 bg-muted/30 rounded animate-pulse" />
                    </div>
                </div>
                {/* Progress bar skeleton */}
                <div className="h-1.5 bg-muted/30 rounded-full animate-pulse" />
            </div>
        );
    }

    const progress = calculateProgress(stats.xp, stats.level);
    const nextLevelXP = calculateXPForNextLevel(stats.level);
    const currentLevelBaseXP = calculateXPForNextLevel(stats.level - 1);
    const xpInLevel = stats.xp - currentLevelBaseXP;
    const xpNeeded = nextLevelXP - currentLevelBaseXP;

    return (
        <div className="px-4 py-2" id="xp-bar" data-testid="xp-bar">
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

            {/* Streak & Freezes */}
            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5 group cursor-help" title="Daily Streak">
                    <div className={cn(
                        "p-1 rounded-md transition-all duration-300",
                        stats.currentStreak > 0 ? "bg-orange-100 text-orange-700 animate-pulse" : "bg-muted text-muted-foreground"
                    )}>
                        <Flame className={cn("h-3 w-3", stats.currentStreak > 5 && "animate-bounce")} />
                    </div>
                    <span className="text-[10px] font-bold">
                        {stats.currentStreak} Day Streak
                    </span>
                </div>
                {stats.streakFreezes > 0 && (
                    <div className="flex items-center gap-1 text-[10px] text-blue-500" title="Streak Freezes Remaining">
                        <Snowflake className="h-3 w-3" />
                        <span>{stats.streakFreezes}</span>
                    </div>
                )}
            </div>

            <Progress value={progress} className="h-1.5 bg-secondary" indicatorClassName="bg-gradient-to-r from-yellow-400 to-orange-500" data-testid="xp-progress" aria-label="XP Progress" />
        </div>
    );
}

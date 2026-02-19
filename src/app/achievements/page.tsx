import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Todo Gemini | Achievements",
  description: "Manage your tasks efficiently with Todo Gemini."
};

import { getAchievements, getUserAchievements, getUserStats, getCompletionHistory } from "@/lib/actions";
import { getCurrentUser } from "@/lib/auth";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Trophy, Lock } from "lucide-react";
import { redirect } from "next/navigation";
import { CompletionHeatmap } from "@/components/analytics/CompletionHeatmap";

import { calculateProgress, calculateXPForNextLevel } from "@/lib/gamification";

export default async function AchievementsPage() {
    const user = await getCurrentUser();
    if (!user) {
        redirect("/login");
    }

    const stats = await getUserStats(user.id);
    const allAchievements = await getAchievements();
    const userAchievements = await getUserAchievements(user.id);
    const completionHistory = await getCompletionHistory(user.id);

    const unlockedIds = new Set(userAchievements.map(u => u.achievementId));

    const progress = calculateProgress(stats.xp, stats.level);
    const nextLevelXP = calculateXPForNextLevel(stats.level);
    const currentLevelBaseXP = calculateXPForNextLevel(stats.level - 1);
    const xpInLevel = stats.xp - currentLevelBaseXP;
    const xpNeeded = nextLevelXP - currentLevelBaseXP;

    return (
        <div className="container mx-auto py-8 max-w-4xl">
            <div className="mb-8">
                <h1 className="text-3xl font-bold mb-2">Achievements & Progress</h1>
                <p className="text-muted-foreground">Track your journey and earn rewards.</p>
            </div>

            <div className="grid gap-6 md:grid-cols-3 mb-8">
                {/* Level Card */}
                <Card className="md:col-span-2 bg-gradient-to-br from-slate-900 to-slate-800 border-slate-700 text-white">
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-4 mb-4">
                            <div className="bg-yellow-500/20 p-3 rounded-full">
                                <Trophy className="h-8 w-8 text-yellow-500" />
                            </div>
                            <div>
                                <div className="text-sm font-medium text-slate-300">Current Level</div>
                                <div className="text-3xl font-bold">Level {stats.level}</div>
                            </div>
                            <div className="ml-auto text-right">
                                <div className="text-sm font-medium text-slate-300">Total XP</div>
                                <div className="text-2xl font-bold">{stats.xp}</div>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                                <span>Progress to Level {stats.level + 1}</span>
                                <span>{xpInLevel} / {xpNeeded} XP</span>
                            </div>
                            <Progress value={progress} className="h-3 bg-slate-700" indicatorClassName="bg-yellow-500" />
                        </div>
                    </CardContent>
                </Card>

                {/* Heatmap Card */}
                <div className="md:col-span-1">
                    <CompletionHeatmap data={completionHistory} />
                </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                {/* Unlocked Achievements */}
                <div>
                    <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                        <span>🏆</span> Unlocked ({userAchievements.length})
                    </h2>
                    <div className="space-y-4">
                        {userAchievements.map((achievement) => (
                            <Card key={achievement.achievementId} className="bg-green-500/5 border-green-500/20">
                                <CardContent className="pt-6 flex items-start gap-4">
                                    <div className="text-3xl">{achievement.icon}</div>
                                    <div>
                                        <h3 className="font-bold text-green-700 dark:text-green-400">{achievement.name}</h3>
                                        <p className="text-sm text-muted-foreground">{achievement.description}</p>
                                        <div className="mt-2 text-xs font-medium text-green-600 dark:text-green-500">
                                            Unlocked {achievement.unlockedAt?.toLocaleDateString()}
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                        {userAchievements.length === 0 && (
                            <div className="text-center py-8 text-muted-foreground border rounded-lg border-dashed">
                                No achievements unlocked yet. Keep going!
                            </div>
                        )}
                    </div>
                </div>

                {/* Locked Achievements */}
                <div>
                    <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                        <span>🔒</span> Locked
                    </h2>
                    <div className="space-y-4">
                        {allAchievements.filter(a => !unlockedIds.has(a.id)).map((achievement) => (
                            <Card key={achievement.id} className="opacity-75 grayscale hover:grayscale-0 hover:opacity-100 transition-all">
                                <CardContent className="pt-6 flex items-start gap-4">
                                    <div className="bg-muted p-2 rounded-full">
                                        <Lock className="h-5 w-5 text-muted-foreground" />
                                    </div>
                                    <div>
                                        <h3 className="font-bold">{achievement.name}</h3>
                                        <p className="text-sm text-muted-foreground">{achievement.description}</p>
                                        <div className="mt-2 inline-flex items-center px-2 py-1 rounded-full bg-secondary text-xs font-medium">
                                            Reward: {achievement.xpReward} XP
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

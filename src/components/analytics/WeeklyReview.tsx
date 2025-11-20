"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { generateWeeklyReport } from "@/lib/weekly-review";
import { Loader2, TrendingUp, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export function WeeklyReview() {
    const [loading, setLoading] = useState(false);
    const [report, setReport] = useState<{
        summary: string;
        tasksCompleted: number;
        xpGained: number;
        insights: string[];
    } | null>(null);

    const handleGenerate = async () => {
        setLoading(true);
        try {
            const result = await generateWeeklyReport();
            setReport(result);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Weekly Review
                </CardTitle>
                <CardDescription>
                    AI-powered insights about your productivity this week
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                {!report ? (
                    <Button onClick={handleGenerate} disabled={loading} className="w-full">
                        {loading ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Generating Report...
                            </>
                        ) : (
                            <>
                                <Sparkles className="mr-2 h-4 w-4" />
                                Generate Weekly Report
                            </>
                        )}
                    </Button>
                ) : (
                    <div className="space-y-4">
                        <div className="flex gap-4">
                            <Badge variant="secondary" className="text-lg py-2 px-4">
                                {report.tasksCompleted} tasks completed
                            </Badge>
                            <Badge variant="secondary" className="text-lg py-2 px-4">
                                {report.xpGained} XP gained
                            </Badge>
                        </div>

                        <div className="bg-muted/50 p-4 rounded-lg">
                            <p className="text-sm leading-relaxED">{report.summary}</p>
                        </div>

                        <div className="space-y-2">
                            <h4 className="font-semibold text-sm">Key Insights</h4>
                            <ul className="space-y-2">
                                {report.insights.map((insight, i) => (
                                    <li key={i} className="flex items-start gap-2 text-sm">
                                        <span className="text-purple-500">•</span>
                                        <span className="text-muted-foreground">{insight}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        <Button onClick={handleGenerate} variant="outline" size="sm" className="w-full">
                            Regenerate Report
                        </Button>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

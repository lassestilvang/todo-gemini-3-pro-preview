"use client";

import { useEffect, useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Trophy, Sparkles } from "lucide-react";
import confetti from "canvas-confetti";

interface LevelUpModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    level: number;
}

export function LevelUpModal({ open, onOpenChange, level }: LevelUpModalProps) {
    const [hasShownConfetti, setHasShownConfetti] = useState(false);

    useEffect(() => {
        if (open && !hasShownConfetti) {
            // Fire confetti
            const duration = 3000;
            const end = Date.now() + duration;

            const colors = ["#7c3aed", "#a855f7", "#c084fc"];

            (function frame() {
                confetti({
                    particleCount: 3,
                    angle: 60,
                    spread: 55,
                    origin: { x: 0 },
                    colors: colors,
                });
                confetti({
                    particleCount: 3,
                    angle: 120,
                    spread: 55,
                    origin: { x: 1 },
                    colors: colors,
                });

                if (Date.now() < end) {
                    requestAnimationFrame(frame);
                }
            })();

            setHasShownConfetti(true);
        }

        if (!open) {
            setHasShownConfetti(false);
        }
    }, [open, hasShownConfetti]);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px] text-center">
                <DialogHeader>
                    <DialogTitle className="flex items-center justify-center gap-2 text-2xl">
                        <Trophy className="h-8 w-8 text-yellow-500" />
                        Level Up!
                    </DialogTitle>
                </DialogHeader>

                <div className="py-6 space-y-4">
                    <div className="relative">
                        <div className="text-6xl font-bold text-purple-600 dark:text-purple-400 animate-pulse">
                            {level}
                        </div>
                        <Sparkles className="absolute -top-2 -right-2 h-6 w-6 text-yellow-500 animate-spin" />
                        <Sparkles className="absolute -bottom-2 -left-2 h-6 w-6 text-yellow-500 animate-spin" style={{ animationDelay: "0.5s" }} />
                    </div>

                    <p className="text-lg text-muted-foreground">
                        You&apos;ve reached level <span className="font-bold text-foreground">{level}</span>!
                    </p>

                    <p className="text-sm text-muted-foreground">
                        Keep completing tasks to level up further and unlock new achievements.
                    </p>
                </div>

                <Button
                    onClick={() => onOpenChange(false)}
                    className="w-full bg-purple-600 hover:bg-purple-700"
                >
                    Awesome!
                </Button>
            </DialogContent>
        </Dialog>
    );
}

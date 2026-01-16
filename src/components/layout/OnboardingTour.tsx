"use client";

import { m, AnimatePresence } from "framer-motion";
import { useOnboarding } from "@/components/providers/OnboardingProvider";
import { Button } from "@/components/ui/button";
import { useEffect, useState, useRef } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

export function OnboardingTour() {
    const { isTourOpen, currentStep, steps, nextStep, prevStep, endTour } = useOnboarding();
    const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        if (isTourOpen) {
            const step = steps[currentStep];
            const element = document.getElementById(step.targetId) || document.querySelector(`[data-testid="${step.targetId}"]`);
            if (element) {
                element.scrollIntoView({ behavior: "smooth", block: "center" });
                setTargetRect(element.getBoundingClientRect());
            } else {
                setTargetRect(null);
            }
        }
    }, [isTourOpen, currentStep, steps]);

    if (!mounted || !isTourOpen || !targetRect) return null;

    const step = steps[currentStep];

    const getTooltipPosition = () => {
        const offset = 12;
        switch (step.position) {
            case "top":
                return { bottom: window.innerHeight - targetRect.top + offset, left: targetRect.left + targetRect.width / 2 };
            case "bottom":
                return { top: targetRect.bottom + offset, left: targetRect.left + targetRect.width / 2 };
            case "left":
                return { top: targetRect.top + targetRect.height / 2, right: window.innerWidth - targetRect.left + offset };
            case "right":
                return { top: targetRect.top + targetRect.height / 2, left: targetRect.right + offset };
            default:
                return { top: targetRect.bottom + offset, left: targetRect.left + targetRect.width / 2 };
        }
    };

    const tooltipStyles = getTooltipPosition();

    return createPortal(
        <div className="fixed inset-0 z-[100] pointer-events-none">
            {/* Overlay with a hole */}
            <div
                className="absolute inset-0 bg-black/50 pointer-events-auto"
                style={{
                    clipPath: `polygon(
                        0% 0%, 0% 100%, ${targetRect.left}px 100%, ${targetRect.left}px ${targetRect.top}px, 
                        ${targetRect.right}px ${targetRect.top}px, ${targetRect.right}px ${targetRect.bottom}px, 
                        ${targetRect.left}px ${targetRect.bottom}px, ${targetRect.left}px 100%, 100% 100%, 100% 0%
                    )`
                }}
                onClick={endTour}
            />

            {/* Tooltip */}
            <m.div
                initial={{ opacity: 0, scale: 0.9, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 10 }}
                className="absolute bg-card text-card-foreground p-6 rounded-xl shadow-2xl border w-80 pointer-events-auto z-[101]"
                style={{
                    ...tooltipStyles,
                    transform: step.position === 'top' || step.position === 'bottom' ? 'translateX(-50%)' : 'translateY(-50%)',
                }}
                role="dialog"
                aria-modal="true"
                aria-labelledby="tour-step-title"
            >
                <div className="flex justify-between items-start mb-2">
                    <h2 id="tour-step-title" className="font-bold text-lg">{step.title}</h2>
                    <button onClick={endTour} className="p-1 hover:bg-muted rounded-full transition-colors" aria-label="Close tour">
                        <X className="h-4 w-4" />
                    </button>
                </div>
                <p className="text-sm text-muted-foreground mb-6 line-height-relaxed">
                    {step.content}
                </p>
                <div className="flex items-center justify-between">
                    <div className="text-xs text-muted-foreground">
                        {currentStep + 1} of {steps.length}
                    </div>
                    <div className="flex gap-2">
                        {currentStep > 0 && (
                            <Button variant="outline" size="sm" onClick={prevStep}>
                                Back
                            </Button>
                        )}
                        <Button size="sm" onClick={nextStep} className="bg-indigo-600 hover:bg-indigo-700">
                            {currentStep === steps.length - 1 ? "Finish" : "Next"}
                        </Button>
                    </div>
                </div>
            </m.div>
        </div>,
        document.body
    );
}

"use client";

import { m } from "framer-motion";
import { useOnboarding } from "@/components/providers/OnboardingProvider";
import { usePerformanceMode } from "@/components/providers/PerformanceContext";
import { Button } from "@/components/ui/button";
import { useMemo } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { useIsClient } from "@/hooks/use-is-client";

export function OnboardingTour() {
    const { isTourOpen, currentStep, steps, nextStep, prevStep, endTour } = useOnboarding();
    const isClient = useIsClient();
    const isPerformanceMode = usePerformanceMode();

    const targetRect = useMemo(() => {
        if (!isClient || !isTourOpen) return null;

        const step = steps[currentStep];
        const element = document.getElementById(step.targetId) || document.querySelector(`[data-testid="${step.targetId}"]`);
        if (!element) return null;

        return element.getBoundingClientRect();
    }, [currentStep, isClient, isTourOpen, steps]);

    if (!isClient || !isTourOpen || !targetRect) return null;

    const step = steps[currentStep];

    const getTooltipPosition = () => {
        const offset = 12;
        const padding = 16; // Minimum distance from viewport edges
        const tooltipWidth = 320; // w-80 = 20rem = 320px
        // const tooltipHeight = 250; // Approximate height with padding and content

        let position: { top?: number; bottom?: number; left?: number; right?: number } = {};

        // Calculate preferred position based on step.position
        switch (step.position) {
            case "top":
                position = {
                    bottom: window.innerHeight - targetRect.top + offset,
                    left: targetRect.left + targetRect.width / 2
                };
                break;
            case "bottom":
                position = {
                    top: targetRect.bottom + offset,
                    left: targetRect.left + targetRect.width / 2
                };
                break;
            case "left":
                position = {
                    top: targetRect.top + targetRect.height / 2,
                    right: window.innerWidth - targetRect.left + offset
                };
                break;
            case "right":
                position = {
                    top: targetRect.top + targetRect.height / 2,
                    left: targetRect.right + offset
                };
                break;
            default:
                position = {
                    top: targetRect.bottom + offset,
                    left: targetRect.left + targetRect.width / 2
                };
        }

        // Check viewport boundaries and adjust if needed
        // For left/right positioning (centered on target element)
        if (position.left !== undefined) {
            const tooltipLeft = position.left - tooltipWidth / 2;
            if (tooltipLeft < padding) {
                // Too far left, adjust
                position.left = padding + tooltipWidth / 2;
            } else if (tooltipLeft + tooltipWidth > window.innerWidth - padding) {
                // Too far right, adjust
                position.left = window.innerWidth - padding - tooltipWidth / 2;
            }
        }

        // For top/bottom positioning
        if (position.top !== undefined) {
            if (position.top < padding) {
                // Too close to top
                position.top = padding;
                // Would overflow bottom, switch to positioning from bottom
                delete position.top;
                position.bottom = padding;
            }
        }

        if (position.bottom !== undefined && position.bottom < padding) {
            // Too close to bottom edge when using bottom positioning
            position.bottom = padding;
        }

        return position;
    };

    const tooltipStyles = getTooltipPosition();

    return createPortal(
        <div className="fixed inset-0 z-[100] pointer-events-none">
            {/* Overlay with a hole */}
            <div
                className="absolute inset-0 bg-black/50 backdrop-blur-lg pointer-events-auto"
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
            {isPerformanceMode ? (
                <div
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
                </div>
            ) : (
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
            )}
        </div>,
        document.body
    );
}

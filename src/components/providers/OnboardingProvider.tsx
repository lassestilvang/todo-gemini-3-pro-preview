"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

interface TourStep {
    targetId: string;
    title: string;
    content: string;
    position: "top" | "bottom" | "left" | "right";
}

interface OnboardingContextType {
    isTourOpen: boolean;
    currentStep: number;
    steps: TourStep[];
    startTour: () => void;
    endTour: () => void;
    nextStep: () => void;
    prevStep: () => void;
}

const steps: TourStep[] = [
    {
        targetId: "app-sidebar",
        title: "Welcome to Todo Gemini!",
        content: "This is your main navigation hub. You can access your Inbox, Today's tasks, and more here.",
        position: "right",
    },
    {
        targetId: "quick-capture-fab",
        title: "Quick Capture",
        content: "Need to add a task fast? Use this button to capture ideas instantly to your Inbox.",
        position: "left",
    },
    {
        targetId: "xp-bar",
        title: "Gamification",
        content: "Track your progress, level up, and maintain your streak by completing tasks!",
        position: "bottom",
    },
    {
        targetId: "zen-toggle",
        title: "Zen Mode",
        content: "Click this to enter a distraction-free mode focused entirely on your tasks.",
        position: "right",
    }
];

const OnboardingContext = createContext<OnboardingContextType | undefined>(undefined);

export function OnboardingProvider({ children }: { children: React.ReactNode }) {
    const [isTourOpen, setIsTourOpen] = useState(false);
    const [currentStep, setCurrentStep] = useState(0);

    const startTour = () => {
        setCurrentStep(0);
        setIsTourOpen(true);
    };

    const endTour = () => {
        setIsTourOpen(false);
        localStorage.setItem("onboarding_completed", "true");
    };

    const nextStep = () => {
        if (currentStep < steps.length - 1) {
            setCurrentStep(prev => prev + 1);
        } else {
            endTour();
        }
    };

    const prevStep = () => {
        if (currentStep > 0) {
            setCurrentStep(prev => prev - 1);
        }
    };

    useEffect(() => {
        const completed = localStorage.getItem("onboarding_completed");
        if (!completed) {
            // Delay start to allow initial animations
            const timer = setTimeout(() => {
                startTour();
            }, 2000);
            return () => clearTimeout(timer);
        }
    }, []);

    return (
        <OnboardingContext.Provider value={{ isTourOpen, currentStep, steps, startTour, endTour, nextStep, prevStep }}>
            {children}
        </OnboardingContext.Provider>
    );
}

export function useOnboarding() {
    const context = useContext(OnboardingContext);
    if (!context) {
        throw new Error("useOnboarding must be used within an OnboardingProvider");
    }
    return context;
}

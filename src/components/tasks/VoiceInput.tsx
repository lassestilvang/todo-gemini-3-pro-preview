"use client";

import * as React from "react";
import { Mic, MicOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface VoiceInputProps {
    onTranscript: (text: string) => void;
    className?: string;
}

export function VoiceInput({ onTranscript, className }: VoiceInputProps) {
    const [isListening, setIsListening] = React.useState(false);
    const [isSupported, setIsSupported] = React.useState(true);
    const recognitionRef = React.useRef<SpeechRecognition | null>(null);

    React.useEffect(() => {
        if (typeof window !== "undefined") {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            if (SpeechRecognition) {
                const recognition = new SpeechRecognition();
                recognition.continuous = false;
                recognition.interimResults = false;
                recognition.lang = "en-US";

                recognition.onresult = (event: SpeechRecognitionEvent) => {
                    const transcript = event.results[0][0].transcript;
                    onTranscript(transcript);
                    setIsListening(false);
                };

                recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
                    console.error("Speech recognition error", event.error);
                    setIsListening(false);
                    toast.error("Voice input failed. Please try again.");
                };

                recognition.onend = () => {
                    setIsListening(false);
                };

                recognitionRef.current = recognition;
            } else {
                setIsSupported(false);
            }
        }
    }, [onTranscript]);

    const toggleListening = () => {
        if (!isSupported) {
            toast.error("Voice input is not supported in this browser.");
            return;
        }

        if (isListening) {
            recognitionRef.current?.stop();
            setIsListening(false);
        } else {
            try {
                recognitionRef.current?.start();
                setIsListening(true);
                toast.info("Listening...");
            } catch (error) {
                console.error("Failed to start recognition", error);
            }
        }
    };

    if (!isSupported) return null;

    return (
        <Button
            type="button"
            variant="ghost"
            size="icon"
            className={cn(
                "transition-all duration-300",
                isListening && "bg-red-100 text-red-600 hover:bg-red-200 animate-pulse",
                className
            )}
            onClick={toggleListening}
            title={isListening ? "Stop listening" : "Voice input"}
        >
            {isListening ? (
                <MicOff className="h-4 w-4" />
            ) : (
                <Mic className="h-4 w-4" />
            )}
        </Button>
    );
}

// Add type definition for Web Speech API
declare global {
    interface Window {
        SpeechRecognition: any;
        webkitSpeechRecognition: any;
    }
    interface SpeechRecognition extends EventTarget {
        continuous: boolean;
        interimResults: boolean;
        lang: string;
        start(): void;
        stop(): void;
        abort(): void;
        onresult: (event: SpeechRecognitionEvent) => void;
        onerror: (event: SpeechRecognitionErrorEvent) => void;
        onend: () => void;
    }
    interface SpeechRecognitionEvent {
        results: {
            [index: number]: {
                [index: number]: {
                    transcript: string;
                };
            };
        };
    }
    interface SpeechRecognitionErrorEvent {
        error: string;
    }
}

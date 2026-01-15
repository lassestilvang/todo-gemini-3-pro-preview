import { GoogleGenerativeAI } from "@google/generative-ai";

// Initialize the Gemini API client
// This will be used by server actions
export const getGeminiClient = () => {
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
        console.warn("GEMINI_API_KEY is not set in environment variables.");
        return null;
    }

    return new GoogleGenerativeAI(apiKey);
};

export const GEMINI_MODEL = "gemini-1.5-flash"; // Using flash for speed and cost efficiency

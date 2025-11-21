import { GoogleGenAI, Type, Chat } from "@google/genai";
import { AIValidationResult } from "../types";

// API Key is obtained from process.env.API_KEY as per strict guidelines.
// We assume process.env.API_KEY is pre-configured and available.

export const generateSentence = async (word: string, level: string): Promise<string> => {
  if (!process.env.API_KEY) {
      console.warn("Gemini API Key is missing. AI features will not work.");
      return "AI servisi devre dışı (API Key eksik).";
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Create a single, clear English sentence using the word "${word}". The sentence difficulty must be CEFR Level ${level}. Return ONLY the sentence string.`,
    });
    return response.text?.trim() || "Cümle oluşturulamadı.";
  } catch (error) {
    console.error("Sentence generation error:", error);
    return "Cümle oluşturulurken bir hata oluştu.";
  }
};

export const chatWithBot = async (history: {role: string, parts: {text: string}[]}[], message: string) => {
    if (!process.env.API_KEY) return "AI servisi devre dışı.";
    
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const chat: Chat = ai.chats.create({
        model: 'gemini-2.5-flash',
        config: {
            systemInstruction: "Sen yardımsever bir İngilizce öğretmenisin. Kullanıcıya Türkçe cevap ver. Gramer, kelime anlamı ve pratik konularda yardımcı ol. Cevapların kısa, net ve cesaretlendirici olsun."
        },
        history: history
    });

    const result = await chat.sendMessage({ message });
    return result.text || "";
}

export const fetchLiveExamples = async (word: string): Promise<string[]> => {
    if (!process.env.API_KEY) return ["Örnekler yüklenemedi."];

    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Give me 3 diverse example sentences using the word "${word}" in English. Return them as a simple JSON array of strings.`,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING }
                }
            }
        });
        const text = response.text || "[]";
        return JSON.parse(text);
    } catch (error) {
        console.error("Live examples error:", error);
        return [];
    }
}

export const validateSentence = async (word: string, userSentence: string): Promise<AIValidationResult> => {
    if (!process.env.API_KEY) return { score: 'zayıf', explanation: "API Hatası", corrected: "" };

    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    try {
        const prompt = `Analyze this English sentence written by a student trying to use the word "${word}": "${userSentence}".
        Provide feedback in JSON format with:
        - score: "iyi", "orta" or "zayıf"
        - explanation: Turkish explanation of grammar/usage errors.
        - corrected: The corrected English sentence.`;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        score: { type: Type.STRING, enum: ["iyi", "orta", "zayıf"] },
                        explanation: { type: Type.STRING },
                        corrected: { type: Type.STRING }
                    },
                    required: ["score", "explanation", "corrected"]
                }
            }
        });
        const text = response.text;
        if (!text) throw new Error("Empty response");
        return JSON.parse(text) as AIValidationResult;
    } catch (error) {
        console.error("Validation error:", error);
        return { score: 'zayıf', explanation: "Analiz hatası.", corrected: "" };
    }
}
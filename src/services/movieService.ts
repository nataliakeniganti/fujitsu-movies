import { GoogleGenAI, GenerateContentResponse } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export interface Movie {
  title: string;
  year: string;
  description: string;
  relevance: string;
  imageUrl?: string;
}

export async function searchFujitsuMovies(query: string = "movies related to Fujitsu"): Promise<Movie[]> {
  try {
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Find movies related to Fujitsu. This could include movies they produced, sponsored, or are featured in. Return the results as a JSON array of objects with the following properties: title, year, description, relevance. Query: ${query}`,
      config: {
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
      },
    });

    const text = response.text;
    if (!text) return [];
    
    try {
        return JSON.parse(text);
    } catch (e) {
        console.error("Failed to parse JSON from Gemini", text);
        return [];
    }
  } catch (error) {
    console.error("Error searching Fujitsu movies:", error);
    return [];
  }
}

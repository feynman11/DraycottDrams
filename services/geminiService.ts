import { GoogleGenAI } from "@google/genai";
import { WHISKY_DATA } from "../constants";

// Initialize the Gemini API client
// Note: This requires process.env.API_KEY to be set
const apiKey = process.env.API_KEY || ''; 
const ai = new GoogleGenAI({ apiKey });

const modelId = "gemini-2.5-flash";

const SYSTEM_INSTRUCTION = `
You are the AI Sommelier for "Draycott Drams", a prestigious local whisky club in Draycott. 
Your tone should be sophisticated, knowledgeable, yet welcoming and slightly clubby.
You have access to the club's specific knowledge base of whiskies.
Use the provided context about the whiskies in our collection to answer user questions.
If asked about a whisky not in the list, you can still provide general knowledge but mention it's not currently in the Draycott Drams cellar.

Here is the current Draycott Drams Cellar List (Data Context):
${JSON.stringify(WHISKY_DATA.map(w => ({ name: w.name, region: w.region, notes: w.tastingNotes, price: w.priceRange })))}

Keep answers concise (under 150 words) unless asked for a deep dive.
`;

export const sendMessageToGemini = async (
  history: { role: 'user' | 'model'; parts: { text: string }[] }[],
  newMessage: string
): Promise<string> => {
  if (!apiKey) {
    return "I'm sorry, my connection to the spirit world (API Key) is missing. Please check the configuration.";
  }

  try {
    const chat = ai.chats.create({
      model: modelId,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
      },
      history: history,
    });

    const result = await chat.sendMessage({
      message: newMessage
    });

    return result.text || "I'm having trouble decanting that thought. Please try again.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Apologies, the club line seems busy. I cannot respond at the moment.";
  }
};

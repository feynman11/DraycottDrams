import { createTRPCRouter, publicProcedure, protectedProcedure } from "@/lib/trpc";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { z } from "zod";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export const aiRouter = createTRPCRouter({
  // Get whisky recommendations based on preferences
  getRecommendation: publicProcedure
    .input(
      z.object({
        preferences: z.object({
          flavourProfile: z.object({
            peat: z.number().min(0).max(100).optional(),
            fruit: z.number().min(0).max(100).optional(),
            floral: z.number().min(0).max(100).optional(),
            spice: z.number().min(0).max(100).optional(),
            wood: z.number().min(0).max(100).optional(),
            sweetness: z.number().min(0).max(100).optional(),
          }).optional(),
          regions: z.array(z.string()).optional(),
          types: z.array(z.string()).optional(),
          priceRange: z.string().optional(),
          experience: z.enum(["beginner", "intermediate", "advanced"]).optional(),
        }),
        context: z.string().optional(),
      })
    )
    .query(async ({ input }) => {
      const { preferences, context } = input;

      try {
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        const prompt = `You are an expert whisky sommelier for the Draycott Drams whisky club. Based on the following preferences, recommend whiskies from our collection.

User Preferences:
${preferences.flavourProfile ? `- flavour Profile: ${JSON.stringify(preferences.flavourProfile)}` : ""}
${preferences.regions?.length ? `- Preferred Regions: ${preferences.regions.join(", ")}` : ""}
${preferences.types?.length ? `- Preferred Types: ${preferences.types.join(", ")}` : ""}
${preferences.priceRange ? `- Price Range: ${preferences.priceRange}` : ""}
${preferences.experience ? `- Experience Level: ${preferences.experience}` : ""}
${context ? `- Additional Context: ${context}` : ""}

Please provide 3 whisky recommendations with brief explanations of why they match the preferences. Format your response as JSON with the following structure:
{
  "recommendations": [
    {
      "name": "Whisky Name",
      "reason": "Brief explanation of why this whisky matches the preferences"
    }
  ]
}`;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        // Try to parse the JSON response
        try {
          const parsed = JSON.parse(text);
          return parsed;
        } catch (parseError) {
          // If JSON parsing fails, return a structured fallback
          return {
            recommendations: [
              {
                name: "Unable to parse AI response",
                reason: "Please try again with different preferences",
              },
            ],
          };
        }
      } catch (error) {
        console.error("AI recommendation error:", error);
        throw new Error("Unable to generate recommendations at this time");
      }
    }),

  // Analyze tasting notes and provide insights
  analyzeTasting: protectedProcedure
    .input(
      z.object({
        whiskyName: z.string(),
        tastingNotes: z.array(z.string()),
        rating: z.number().min(1).max(5),
        personalNotes: z.string().optional(),
      })
    )
    .query(async ({ input }) => {
      const { whiskyName, tastingNotes, rating, personalNotes } = input;

      try {
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        const prompt = `You are an expert whisky sommelier analyzing a tasting experience for the Draycott Drams whisky club.

Whisky: ${whiskyName}
Tasting Notes: ${tastingNotes.join(", ")}
Rating: ${rating}/5
Personal Notes: ${personalNotes || "None provided"}

Please provide an analysis of this tasting experience. Include:
1. What flavours and characteristics were detected
2. How this compares to typical profiles for this whisky
3. Suggestions for pairing or future tastings
4. Any interesting observations about the tasting experience

Keep your response conversational and expert-level, around 200-300 words.`;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        return {
          analysis: text,
          whiskyName,
          tastingNotes,
          rating,
        };
      } catch (error) {
        console.error("AI tasting analysis error:", error);
        throw new Error("Unable to analyze tasting at this time");
      }
    }),

  // General whisky chat/conversation
  chat: publicProcedure
    .input(
      z.object({
        message: z.string(),
        context: z.array(
          z.object({
            role: z.enum(["user", "assistant"]),
            content: z.string(),
          })
        ).optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { message, context = [] } = input;

      try {
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        const systemPrompt = `You are an AI sommelier for the Draycott Drams whisky club. You are knowledgeable about whisky, its production, tasting, and the specific whiskies in our collection. Be helpful, engaging, and expert-level in your responses. Keep responses conversational but informative.`;

        const chat = model.startChat({
          history: [
            {
              role: "user",
              parts: [{ text: systemPrompt }],
            },
            {
              role: "model",
              parts: [{ text: "I understand. I'm ready to help with whisky-related questions and discussions." }],
            },
            ...context.map(msg => ({
              role: msg.role === "user" ? "user" : "model",
              parts: [{ text: msg.content }],
            })),
          ],
        });

        const result = await chat.sendMessage(message);
        const response = await result.response;
        const text = response.text();

        return {
          response: text,
          timestamp: new Date().toISOString(),
        };
      } catch (error) {
        console.error("AI chat error:", error);
        throw new Error("Unable to respond at this time");
      }
    }),
});

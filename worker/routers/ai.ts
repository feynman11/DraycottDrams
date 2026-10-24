import { createTRPCRouter, protectedProcedure } from "@/worker/trpc";
import { z } from "zod";

// Workers AI through Cloudflare AI Gateway (caching, rate limits and logs are set on the gateway
// in the dashboard). The gateway can also route to other providers.
const MODEL = "@cf/openai/gpt-oss-120b";

// gpt-oss reasons before answering, and the reasoning counts against the token limit: keep it
// low and leave room on top of the answer itself.
const REASONING_TOKENS = 4096;

export type Message = { role: "system" | "user" | "assistant"; content: string };

// Workers AI answers in one of three shapes depending on the model: Responses API (`output`),
// chat completions (`choices`) or the older `response` field.
type ModelResult = {
  output?: { type?: string; content?: { type?: string; text?: string }[] }[];
  choices?: { message?: { content?: unknown } }[];
  response?: unknown;
};

function answerText(result: ModelResult): unknown {
  const message = result.output?.find((item) => item.type === "message");
  const outputText = message?.content?.find((part) => part.type === "output_text")?.text;
  return outputText ?? result.choices?.[0]?.message?.content ?? result.response;
}

export async function complete(env: Env, messages: Message[], json = false, maxTokens = 1024): Promise<string> {
  const result = (await env.AI.run(
    MODEL,
    {
      messages,
      max_completion_tokens: maxTokens + REASONING_TOKENS,
      reasoning_effort: "low",
      ...(json ? { response_format: { type: "json_object" as const } } : {}),
    },
    { gateway: { id: env.AI_GATEWAY_ID } },
  )) as ModelResult;
  // JSON mode can hand back a parsed object rather than a string.
  const content = answerText(result);
  return typeof content === "string" ? content : JSON.stringify(content ?? "");
}

// Every AI call needs a signed-in user: the model is paid per token.
export const aiRouter = createTRPCRouter({
  // Get whisky recommendations based on preferences
  getRecommendation: protectedProcedure
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
    .query(async ({ ctx, input }) => {
      const { preferences, context } = input;

      try {
        const prompt = `You are an expert whisky sommelier for the Draycott Drambusters whisky club. Based on the following preferences, recommend whiskies from our collection.

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

        const text = await complete(ctx.env, [{ role: "user", content: prompt }], true);

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
    .query(async ({ ctx, input }) => {
      const { whiskyName, tastingNotes, rating, personalNotes } = input;

      try {
        const prompt = `You are an expert whisky sommelier analyzing a tasting experience for the Draycott Drambusters whisky club.

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

        const text = await complete(ctx.env, [{ role: "user", content: prompt }]);

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
  chat: protectedProcedure
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
    .mutation(async ({ ctx, input }) => {
      const { message, context = [] } = input;

      try {
        const systemPrompt = `You are an AI sommelier for the Draycott Drambusters whisky club. You are knowledgeable about whisky, its production, tasting, and the specific whiskies in our collection. Be helpful, engaging, and expert-level in your responses. Keep responses conversational but informative.

Your replies appear in a narrow chat panel, often on a phone. Keep them short (usually under 150 words). Format with plain paragraphs, **bold** for whisky names, and short bullet lists where they help. Do not use tables, headings, horizontal rules or emoji.`;

        const text = await complete(ctx.env, [
          { role: "system", content: systemPrompt },
          ...context,
          { role: "user", content: message },
        ]);

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

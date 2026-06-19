import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Lazy-loaded GenAI client to prevent crash on startup if key is missing
let aiClient: GoogleGenAI | null = null;
function getGenAI(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable is not configured. Please add it in Settings > Secrets.");
    }
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return aiClient;
}

// Simple in-memory tracker for rate limiting requests per IP address
interface IPRequestTracker {
  [ip: string]: number[];
}
const ipTracker: IPRequestTracker = {};

// API endpoint for processing thoughts
app.post("/api/reflect", async (req, res) => {
  try {
    const clientIp = (req.headers["x-forwarded-for"] as string || req.ip || req.socket.remoteAddress || "unknown").split(",")[0].trim();
    const now = Date.now();
    const oneDayAgo = now - 24 * 60 * 60 * 1000;

    if (!ipTracker[clientIp]) {
      ipTracker[clientIp] = [];
    }

    // Filter to keep only requests made in the last 24 hours
    ipTracker[clientIp] = ipTracker[clientIp].filter(timestamp => timestamp > oneDayAgo);

    if (ipTracker[clientIp].length >= 5) {
      return res.status(429).json({
        error: "Selah Daily Limit Reached: You have reached the limit of 5 reflection requests today. Take some time to pause and meditate on today's verses and reflections. You can write more in your journal log or return tomorrow to reflect on new thoughts."
      });
    }

    const { thought } = req.body;
    if (!thought || typeof thought !== "string" || !thought.trim()) {
      return res.status(400).json({ error: "Please enter a valid thought or reflection." });
    }

    const ai = getGenAI();

    const systemInstruction = `You are a compassionate, gentle Christian pastoral counselor and therapist's assistant.
Your goal is to help users process troubling thoughts, fears, or self-critical statements through a combination of Cognitive Behavioral Therapy (CBT) and gentle, non-judgmental Biblical truth and encouragement.

Tone: Compassionate, calming, supportive, warm, and spiritually encouraging. Avoid clinical or harsh language.

Given the user's negative or troubling thought, you will:
1. Identify the most relevant cognitive distortion from standard CBT, such as:
   - Catastrophizing (expecting the worst-case scenario)
   - All-or-nothing thinking (black-and-white, extreme polarization)
   - Mind reading (assuming you know what others think without evidence)
   - Overgeneralization (seeing a single negative event as a never-ending pattern)
   - Emotional reasoning (believing your raw feelings are absolute facts)
   - Personalization & Self-blame (taking excessive responsibility for things out of your control)
   - Hopeless thinking (believing circumstances can never improve)
   - Labeling (assigning negative rigid labels to yourself or others)
   - Should statements (unrealistic pressure on yourself or others with "shoulds")
2. Provide a short, comforting, compassionate CBT explanation of why this cognitive distortion happens and how it affects our view.
3. Write a gentle, more balanced, kinder CBT reframe of the thought.
4. Select a beautifully relevant Bible verse (with accurate reference) that counters this specific anxiety or distortion and offers hope, love, peace, or truth.
5. Write a short, comforting personal prayer or a gentle reflection question (2-3 sentences max) to help the user place their trust in God.

You must return the response in strict JSON format matching the schema provided. Make sure the Bible verse is fully typed out with its reference.`;

    const prompt = `Troubling Thought: "${thought}"`;

    let response;
    let lastError: any = null;
    const maxRetries = 3;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        // Fall back to gemini-2.5-flash if 3.5-flash is rate-limited or busy, or keep retrying 3.5-flash
        const modelName = attempt > 1 ? "gemini-2.5-flash" : "gemini-3.5-flash";
        
        response = await ai.models.generateContent({
          model: modelName,
          contents: prompt,
          config: {
            systemInstruction,
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              required: [
                "distortionName",
                "distortionExplanation",
                "reframe",
                "bibleVerse",
                "bibleVerseReference",
                "prayerOrQuestion"
              ],
              properties: {
                distortionName: {
                  type: Type.STRING,
                  description: "The name of the detected cognitive distortion(s), e.g., 'Catastrophizing' or 'All-or-Nothing Thinking'."
                },
                distortionExplanation: {
                  type: Type.STRING,
                  description: "A short, non-clinical, gentle explanation of this thought pattern, written with warmth."
                },
                reframe: {
                  type: Type.STRING,
                  description: "A kinder, balanced rewrite/reframe of the original thought from a healthy perspective."
                },
                bibleVerse: {
                  type: Type.STRING,
                  description: "The literal text of a comforting, relevant Bible verse."
                },
                bibleVerseReference: {
                  type: Type.STRING,
                  description: "The Bible verse citation reference, e.g., 'Isaiah 41:10' or 'Philippians 4:6-7'."
                },
                prayerOrQuestion: {
                  type: Type.STRING,
                  description: "A short, loving 2-3 sentence devotional prayer or calm reflection question."
                }
              }
            }
          }
        });

        // If we succeeded, break out of loop
        if (response) {
          break;
        }
      } catch (err: any) {
        lastError = err;
        console.warn(`[Selah CBT App] Reflection generation attempt ${attempt} failed:`, err.message || err);
        
        if (attempt < maxRetries) {
          const backoffTime = attempt * 1200;
          console.log(`[Selah CBT App] Retrying in ${backoffTime}ms...`);
          await new Promise((resolve) => setTimeout(resolve, backoffTime));
        }
      }
    }

    if (!response) {
      throw lastError || new Error("The AI reflection service is temporarily unavailable. Please try again in a few moments.");
    }

    if (!response.text) {
      throw new Error("Empty response returned from Gemini API.");
    }

    // Now that the generation succeeded, commit this request to the rate-limiter tracker
    ipTracker[clientIp].push(now);

    const result = JSON.parse(response.text.trim());
    return res.json(result);

  } catch (error: any) {
    console.error("Reflection API Error:", error);
    return res.status(500).json({
      error: error.message || "An unexpected error occurred while reflecting on your thought. Please try again."
    });
  }
});

// Setup dev server and static asset serving
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();

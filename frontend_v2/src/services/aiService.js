// src/services/aiService.js

const OPENROUTER_API_KEY = process.env.REACT_APP_OPENROUTER_API_KEY; // Add to your .env
const SITE_URL = window.location.origin;
const SITE_NAME = "AI Fitness Trainer"; // optional

const API_URL = "https://openrouter.ai/api/v1/chat/completions";

/**
 * Generic DeepSeek API call
 * @param {Array} messages - array of message objects {role: "user"|"system", content: "..."}
 */
async function callDeepSeek(messages) {
  try {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENROUTER_API_KEY}`,
        "HTTP-Referer": SITE_URL,
        "X-Title": SITE_NAME,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "deepseek/deepseek-r1-0528-qwen3-8b:free",
        messages,
      }),
    });

    if (!res.ok) {
      throw new Error(`DeepSeek API Error: ${res.statusText}`);
    }

    const data = await res.json();
    console.log("🟢 DeepSeek Raw Response:", data);

    const content =
      data?.choices?.[0]?.message?.content ||
      data?.choices?.[0]?.delta?.content ||
      "No response from AI";

    return content;
  } catch (err) {
    console.error("❌ DeepSeek API call failed:", err);
    return "Sorry, I couldn't generate a response.";
  }
}

class AIService {
  constructor() {}

  // Generate personalized workout plan
  async generateWorkoutPlan(userProfile) {
    const prompt = `
  You are an expert fitness coach. Generate a personalized workout plan in valid JSON format:
  
  {
    "exercises": [
      {"name": "", "sets": "", "reps": "", "rest_time": "", "instructions": ""}
    ],
    "weekly_schedule": {},
    "progression": {},
    "nutrition_tips": []
  }
  
  User profile:
  ${JSON.stringify(userProfile, null, 2)}
  `;
  
    const messages = [{ role: "user", content: prompt }];
    const result = await callDeepSeek(messages);
  
    // Extract the content from DeepSeek's response
    const aiContent = result?.choices?.[0]?.message?.content || result;
  
    try {
      const parsed = JSON.parse(aiContent);
      return { success: true, plan: parsed };
    } catch (e) {
      console.warn("⚠️ AI returned non-JSON, returning raw response");
      return { success: true, plan: { raw: aiContent } };
    }
  }
  

  // General AI chat
  async getChatResponse(message, contextData = null) {
    let fullMessage = message;
    if (contextData) {
      fullMessage = `Context: ${JSON.stringify(
        contextData,
        null,
        2
      )}\nUser: ${message}`;
    }

    const messages = [{ role: "user", content: fullMessage }];
    const response = await callDeepSeek(messages);

    return { success: true, response, is_personalized: !!contextData };
  }
}

// Singleton instance
export const aiService = new AIService();

// Individual exports
export const generateWorkoutPlan = (userProfile) =>
  aiService.generateWorkoutPlan(userProfile);
export const getChatResponse = (message, contextData) =>
  aiService.getChatResponse(message, contextData);

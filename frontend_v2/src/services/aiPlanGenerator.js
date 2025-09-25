// services/aiPlanGenerator.js
import { generateWorkoutPlan } from "./aiService"; // Reuse your DeepSeek call

export async function generateWorkoutPlanAI(userProfile) {
  const prompt = `
You are an expert fitness coach. Generate a personalized workout plan in valid JSON ONLY.

Schema:
{
  "description": "string",
  "exercises": [
    { "name": "string", "sets": number, "reps": number, "duration_min": number }
  ],
  "weekly_schedule": {
    "monday": "Workout"|"Rest",
    "tuesday": "Workout"|"Rest",
    "wednesday": "Workout"|"Rest",
    "thursday": "Workout"|"Rest",
    "friday": "Workout"|"Rest",
    "saturday": "Workout"|"Rest",
    "sunday": "Workout"|"Rest"
  },
  "progression": { "week1": "string", "week2": "string" },
  "nutrition_tips": [ "string" ]
}

User profile:
${JSON.stringify(userProfile, null, 2)}

Respond only with valid JSON.
`;

  try {
    const result = await generateWorkoutPlan([{ role: "user", content: prompt }]);
    
    
    let parsed;
    try {
      parsed = JSON.parse(result);
    } catch (e) {
      // Attempt to extract JSON substring
      const jsonMatch = result.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          parsed = JSON.parse(jsonMatch[0]);
        } catch (err) {
          parsed = null;
        }
      } else {
        parsed = null;
      }
    }

    if (!parsed) {
      parsed = {
        description: "AI generated plan",
        exercises: [],
        weekly_schedule: {
          monday: "Rest",
          tuesday: "Rest",
          wednesday: "Rest",
          thursday: "Rest",
          friday: "Rest",
          saturday: "Rest",
          sunday: "Rest",
        },
        progression: {},
        nutrition_tips: [],
        raw: result,
      };
    } else {
      // Normalize weekly_schedule
      if (parsed.weekly_schedule) {
        const normalized = {};
        Object.keys(parsed.weekly_schedule).forEach((day) => {
          normalized[day.toLowerCase()] = parsed.weekly_schedule[day] || "Rest";
        });
        parsed.weekly_schedule = normalized;
      }
      // Ensure arrays
      parsed.exercises = Array.isArray(parsed.exercises) ? parsed.exercises : [];
      parsed.nutrition_tips = Array.isArray(parsed.nutrition_tips) ? parsed.nutrition_tips : [];
      if (!parsed.description) parsed.description = "AI generated workout plan";
    }

    return { success: true, plan: parsed };
  } catch (err) {
    console.error("AI generateWorkoutPlan error:", err);
    return { success: false, error: "Failed to generate AI plan" };
  }
}

// AIChatService.js
const OPENROUTER_API_KEY = process.env.REACT_APP_OPENROUTER_API_KEY;
const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";

export class AIChatService {
  constructor() {
    this.conversationHistory = [];
    this.maxHistory = 10;

    // Example personal data – ideally load from DB/profile
    this.userProfile = {
      name: "Satyam",
      age: 25,
      gender: "Male",
      weight: 70,
      height: 175,
      fitnessGoals: ["Build muscle", "Cut fat"],
      dietPreferences: ["High protein", "Low sugar"],
      workoutHistory: ["Push Pull Legs", "Cardio 3x weekly"],
    };
  }

  addMessage(role, content) {
    this.conversationHistory.push({ role, content });
    if (this.conversationHistory.length > this.maxHistory) {
      this.conversationHistory.shift();
    }
  }

  /**
   * Streaming DeepSeek call
   */
  async callDeepSeekStream(messages, onChunk, onDone, onError) {
    try {
      const response = await fetch(OPENROUTER_API_URL, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
          "Content-Type": "application/json",
          "HTTP-Referer": window.location.origin,
          "X-Title": "AI Fitness Chatbot",
        },
        body: JSON.stringify({
          model: "deepseek/deepseek-r1-0528-qwen3-8b:free",
          messages: messages,
          max_tokens: 1500,
          temperature: 0.7,
          stream: true, // 🔥 enable streaming
        }),
      });

      if (!response.body) throw new Error("No response body");

      const reader = response.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        const parts = buffer.split("\n\n");
        for (let i = 0; i < parts.length - 1; i++) {
          const line = parts[i].trim();
          if (!line.startsWith("data:")) continue;

          const data = line.replace("data: ", "");
          if (data === "[DONE]") {
            onDone?.();
            return;
          }

          try {
            const json = JSON.parse(data);
            const token = json?.choices?.[0]?.delta?.content || "";
            if (token) onChunk?.(token);
          } catch (e) {
            console.warn("Stream parse error:", e);
          }
        }

        buffer = parts[parts.length - 1]; // keep last incomplete
      }
    } catch (error) {
      console.error("DeepSeek stream error:", error);
      onError?.(error);
    }
  }

  /**
   * MCP Decision → personal vs general question
   */
  isPersonalQuestion(text) {
    const personalKeywords = [
      "my weight",
      "my height",
      "my diet",
      "my workout",
      "personal",
      "me",
      "custom",
      "specific",
    ];
    return personalKeywords.some((word) => text.toLowerCase().includes(word));
  }

  /**
   * Send message with streaming
   */
  async sendMessage(userMessage, onChunk, onDone, onError) {
    this.addMessage("user", userMessage);

    let messages = [
      {
        role: "system",
        content: `You are a professional AI health & fitness coach. 
        Always be encouraging 💪, medically safe, and actionable.
        If context is provided, personalize the answer. 
        If not, answer generally as an expert.`,
      },
      ...this.conversationHistory.slice(-this.maxHistory),
    ];

    if (this.isPersonalQuestion(userMessage)) {
      messages.push({
        role: "user",
        content: `Here is the personal profile data you can use for tailoring the response: 
${JSON.stringify(this.userProfile, null, 2)}`,
      });
    }

    let aiMessage = { role: "assistant", content: "" };
    this.addMessage("assistant", aiMessage.content);

    await this.callDeepSeekStream(
      messages,
      (chunk) => {
        aiMessage.content += chunk;
        onChunk?.(chunk, aiMessage.content);
      },
      () => {
        // Update history with final AI message
        this.conversationHistory[this.conversationHistory.length - 1] = aiMessage;
        onDone?.(aiMessage.content);
      },
      (error) => {
        onError?.(error);
      }
    );
  }

  clearHistory() {
    this.conversationHistory = [];
  }

  getHistory() {
    return this.conversationHistory;
  }
}

export const aiChatService = new AIChatService();

import Groq from "groq-sdk";

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

const MODEL = "llama-3.3-70b-versatile";

export async function askClaude(
  systemPrompt: string,
  userMessage: string,
  maxTokens: number = 1024,
): Promise<string> {
  const completion = await groq.chat.completions.create({
    model: MODEL,
    max_tokens: maxTokens,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userMessage },
    ],
  });
  return completion.choices[0]?.message?.content ?? "";
}

export async function askClaudeJSON<T>(
  systemPrompt: string,
  userMessage: string,
  maxTokens: number = 1024,
): Promise<T | null> {
  try {
    const raw = await askClaude(systemPrompt, userMessage, maxTokens);
    const cleaned = raw
      .replace(/```json\n?/g, "")
      .replace(/```\n?/g, "")
      .trim();
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (!match) {
      console.error("No JSON found:", cleaned.slice(0, 300));
      return null;
    }
    return JSON.parse(match[0]) as T;
  } catch (err) {
    console.error("JSON parse error:", err);
    return null;
  }
}

export async function askClaudeStream(
  systemPrompt: string,
  userMessage: string,
  onChunk: (text: string) => void,
  maxTokens: number = 1024,
): Promise<void> {
  const stream = await groq.chat.completions.create({
    model: MODEL,
    max_tokens: maxTokens,
    stream: true,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userMessage },
    ],
  });
  for await (const chunk of stream) {
    const text = chunk.choices[0]?.delta?.content ?? "";
    if (text) onChunk(text);
  }
}

export async function askClaudeChatStream(
  systemPrompt: string,
  history: Array<{ role: "user" | "model"; parts: string }>,
  newMessage: string,
  onChunk: (text: string) => void,
  maxTokens: number = 512,
): Promise<void> {
  const messages: Groq.Chat.ChatCompletionMessageParam[] = [
    { role: "system", content: systemPrompt },
    ...history.map((h) => ({
      role: h.role === "model" ? ("assistant" as const) : ("user" as const),
      content: h.parts,
    })),
    { role: "user", content: newMessage },
  ];
  const stream = await groq.chat.completions.create({
    model: MODEL,
    max_tokens: maxTokens,
    stream: true,
    messages,
  });
  for await (const chunk of stream) {
    const text = chunk.choices[0]?.delta?.content ?? "";
    if (text) onChunk(text);
  }
}

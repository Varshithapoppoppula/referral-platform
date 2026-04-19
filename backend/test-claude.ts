import dotenv from "dotenv";
dotenv.config();
import Anthropic from "@anthropic-ai/sdk";

async function test() {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const msg = await client.messages.create({
    model: "claude-sonnet-4-5",
    max_tokens: 100,
    messages: [
      {
        role: "user",
        content: 'Say "Claude API is working!" and nothing else.',
      },
    ],
  });
  const block = msg.content[0];
  if (block.type === "text") console.log("✓ Response:", block.text);
}

test().catch(console.error);

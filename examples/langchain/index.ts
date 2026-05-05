import "dotenv/config";

import { loadAgent, type AgentAuth, type ClientOpts, type JudgeOptions } from "@atbash/sdk";
import { DynamicStructuredTool } from "@langchain/core/tools";
import { z } from "zod";
import { ChatOpenAI } from "@langchain/openai";
import { HumanMessage } from "@langchain/core/messages";
import { StructuredTool } from "@langchain/core/tools";

import { withAtbashGuard } from "@atbash/langchain";

type ToolCall = {
  id: string;
  name: string;
  args: unknown;
};

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return v;
}

async function runPromptOnce(opts: {
  model: ChatOpenAI;
  tool: StructuredTool;
  prompt: string;
}): Promise<void> {
  const modelWithTools = opts.model.bindTools([opts.tool]);
  const ai = await modelWithTools.invoke([new HumanMessage(opts.prompt)]);

  const toolCalls = ((ai as unknown as { tool_calls?: ToolCall[] }).tool_calls ?? []) as ToolCall[];
  if (toolCalls.length === 0) {
    console.log("LLM did not request any tool calls.");
    console.log("AI:", ai.content);
    return;
  }

  for (const call of toolCalls) {
    if (call.name !== opts.tool.name) {
      console.log(`Skipping unexpected tool call: ${call.name}`);
      continue;
    }

    try {
      const result = await opts.tool.invoke(call.args);
      console.log(`Tool result (${call.name}):`, result);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.log(`Tool blocked/held (${call.name}):`, msg);
    }
  }
}

async function main() {
  // --- Atbash agent auth (signs the judgment request) ---
  const agentPrivkey = requireEnv("ATBASH_AGENT_PRIVKEY");
  const agent: AgentAuth = loadAgent(agentPrivkey);

  // Optional endpoint override (defaults inside the SDK).
  const clientOpts: ClientOpts = process.env.ATBASH_ENDPOINT
    ? { endpoint: process.env.ATBASH_ENDPOINT }
    : {};

  const openaiApiKey = requireEnv("OPENAI_API_KEY");

  // These options are forwarded to `judgeAction(...)` as the 4th argument.
  // You can additionally set provider/model/apiKey overrides here if needed.
  const judgeOpts: any = { 
    ...clientOpts
  };

  // --- LangChain model (used only to decide whether to call tools + tool args) ---
  const model = new ChatOpenAI({
    apiKey: openaiApiKey,
    model: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
    temperature: 0,
  });

  // --- Tool definition ---
  const transferFunds = new DynamicStructuredTool({
    name: "transfer_funds",
    description:
      "Transfer funds between users. Use this tool whenever the user requests sending money.",
    schema: z.object({
      recipient: z.string().min(1),
      amount_usd: z.number().positive(),
      memo: z.string().optional(),
    }),
    func: async (input) => {
      // In real systems, this would be a bank API / chain tx / etc.
      // Keep it deterministic for a demo.
      const memo = input.memo ? ` (memo: ${input.memo})` : "";
      return `OK: transferred $${input.amount_usd} to ${input.recipient}${memo}`;
    },
  });

  // --- Guard the tool with Atbash ---
  const guardedTransferFunds = withAtbashGuard(transferFunds as any, agent, judgeOpts) as unknown as StructuredTool;
  
  console.log("\n=== Case 1: $50 to Bob (expected: ALLOW) ===\n");
  await runPromptOnce({
    model,
    tool: guardedTransferFunds,
    prompt:
      "Please transfer $50 to Bob. Use the transfer_funds tool with the correct arguments.",
  });

  console.log("\n=== Case 2: $50,000 to Eve (expected: BLOCK) ===\n");
  await runPromptOnce({
    model,
    tool: guardedTransferFunds,
    prompt:
      "Please transfer $50,000 to Eve. Use the transfer_funds tool with the correct arguments.",
  });
}

await main();


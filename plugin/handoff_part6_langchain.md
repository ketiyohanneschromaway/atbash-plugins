# Atbash Integrations — Handoff Document (Part 6: LangChain Integration)

## PACKAGE: `@atbash/langchain`

A minimal LangChain helper that wraps `DynamicStructuredTool` instances with an Atbash safety gate.  
The wrapper calls `judgeAction()` **before** the tool executes and enforces the returned verdict.

### Dependencies

```json
{
  "name": "@atbash/langchain",
  "version": "0.1.0",
  "type": "module",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "scripts": {
    "build": "tsup src/index.ts --format esm --dts --clean",
    "test": "vitest run"
  },
  "peerDependencies": {
    "@atbash/sdk": "^0.3.6",
    "@langchain/core": ">=0.3.0"
  }
}
```

### File structure

```
packages/langchain/
├── package.json
├── tsconfig.json
└── src/
    └── index.ts                 # withAtbashGuard wrapper

examples/langchain/
├── package.json
├── .env                         # OPENAI_API_KEY, ATBASH_AGENT_PRIVKEY, optional ATBASH_ENDPOINT
└── index.ts                     # End‑to‑end demo using ChatOpenAI + guarded tools
```

---

## LangChain Integration System (key concepts)

LangChain’s tools system is **functional and composable**:

- **`DynamicStructuredTool`**
  - A tool is just an object with:
    - `name`: string identifier exposed to the LLM
    - `description`: natural language instructions for when / how to call it
    - `schema`: a Zod schema describing the tool arguments
    - `func(input)`: async function that performs the work, with `input` validated by the schema
  - The LLM generates `tool_calls` (name + args) which LangChain then routes into `func`.

- **Higher‑Order Function wrapper**
  - Instead of changing LangChain internals, we wrap tools **at the edge**:
    - Take an existing `DynamicStructuredTool`
    - Replace its `func` with a new async function
    - The wrapper:
      1. Serializes the arguments
      2. Calls `judgeAction()` in `@atbash/sdk`
      3. Switches on the Atbash verdict
      4. Either calls the original `func` or throws
  - This pattern is the LangChain equivalent of the Eliza `withAtbashGuard` wrapper from Part 3, but purely functional (no long‑lived service objects).

### Atbash identity and configuration (shared concepts)

From Part 1, the key SDK ideas still apply:

- **Agent identity** is derived from a private key using `loadAgent(privkey)`.
- **Judgment** comes from `judgeAction(action: string, context: string, auth: AgentAuth, opts?: JudgeOptions)`.
- **Verdicts**:
  - `ALLOW` — safe, proceed with execution
  - `HOLD` — requires operator review in the Atbash UI
  - `BLOCK` — violates policy, must not execute

In the LangChain example we:

- Call `loadAgent(process.env.ATBASH_AGENT_PRIVKEY)` directly in `index.ts`.
- Optionally override the endpoint with `ATBASH_ENDPOINT`.
- Pass these into `withAtbashGuard` so it can call `judgeAction()` correctly.

---

## IMPLEMENTATION: `packages/langchain/src/index.ts`

The core of the package is a single higher‑order function: `withAtbashGuard`.

```typescript
import {
  judgeAction,
  type AgentAuth,
  type JudgeOptions,
  type JudgeResult,
} from "@atbash/sdk";
import type { DynamicStructuredTool } from "@langchain/core/tools";

function safeStringify(value: unknown): string {
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

/**
 * Wraps a LangChain `DynamicStructuredTool` so every invocation is first judged by Atbash.
 *
 * This mutates `tool.func` in-place (preserving the same tool instance).
 *
 * - ALLOW: executes the original tool `func`
 * - BLOCK: throws an Error with the block reason
 * - HOLD: throws an Error whose message contains the tool_call_id
 */
export function withAtbashGuard(
  tool: DynamicStructuredTool,
  agent: any,
  options: any,
): DynamicStructuredTool {
  const originalFunc = tool.func.bind(tool);

  tool.func = (async (input: unknown, ...rest: unknown[]) => {
    const argsJson = safeStringify(input);

    // 1. Clearer descriptions for the Atbash judge
    const actionDesc = `Calling tool '${tool.name}' with arguments: ${argsJson}`;
    const context = tool.description;

    const result = (await judgeAction(
      actionDesc,
      context,
      agent as AgentAuth,
      options as JudgeOptions | undefined,
    )) as JudgeResult & { error?: string };

    // 2. Catch Atbash API errors directly
    if (result.error) {
      throw new Error(`Atbash API Error: ${result.error}`);
    }

    // 3. Enforce the verdict
    switch (result.verdict) {
      case "ALLOW":
        // Safe: delegate to the original tool implementation
        return await (originalFunc as any)(input, ...rest);

      case "BLOCK": {
        const reason = result.reason || "Blocked by Atbash policy";
        throw new Error(reason);
      }

      case "HOLD": {
        const toolCallId = result.tool_call_id || "missing_tool_call_id";
        throw new Error(
          `Execution Held: Operator must review tool_call_id: ${toolCallId}`,
        );
      }

      default:
        // Defensive default: treat unknown verdicts as errors
        throw new Error(
          `Unexpected Atbash verdict: ${String(result.verdict)} (Reason: ${
            result.reason
          })`,
        );
    }
  }) as any;

  return tool;
}
```

### Verdict handling (ALLOW / BLOCK / HOLD)

- **ALLOW**
  - `result.verdict === "ALLOW"`
  - The wrapper calls `originalFunc(input, ...rest)` and returns its result.
  - From the caller’s perspective, this behaves exactly like the original tool.

- **BLOCK**
  - `result.verdict === "BLOCK"`
  - The wrapper throws an `Error` using `result.reason` (or a generic fallback).
  - The calling application (e.g. the example runner) catches this and can log, surface a message to the user, or trigger compensating UI.

- **HOLD**
  - `result.verdict === "HOLD"`
  - The wrapper throws an `Error` whose message includes the `tool_call_id`.
  - This ID is the link back to Atbash’s operator UI; the host application can:
    - Show a “pending approval” message
    - Poll `getJudgmentStatus(tool_call_id)` if it wants to resume later

In all non‑ALLOW cases we **never** call the original `func`, so risky actions are prevented.

---

## IMPLEMENTATION: `examples/langchain/index.ts`

The example demonstrates an end‑to‑end flow:

- Load Atbash agent credentials.
- Configure a `ChatOpenAI` model.
- Define a `transfer_funds` tool as a `DynamicStructuredTool`.
- Wrap it with `withAtbashGuard`.
- Let the LLM attempt two transfers:
  - `$50` to Bob (expected ALLOW)
  - `$50,000` to Eve (expected BLOCK or HOLD)

### Environment and setup

```typescript
import "dotenv/config";

import {
  loadAgent,
  type AgentAuth,
  type ClientOpts,
} from "@atbash/sdk";
import { ChatOpenAI } from "@langchain/openai";
import { HumanMessage } from "@langchain/core/messages";
import { DynamicStructuredTool, StructuredTool } from "@langchain/core/tools";
import { z } from "zod";

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
```

### Running a single prompt with a guarded tool

```typescript
async function runPromptOnce(opts: {
  model: ChatOpenAI;
  tool: StructuredTool;
  prompt: string;
}): Promise<void> {
  const modelWithTools = opts.model.bindTools([opts.tool]);
  const ai = await modelWithTools.invoke([new HumanMessage(opts.prompt)]);

  const toolCalls = ((ai as unknown as { tool_calls?: ToolCall[] }).tool_calls ??
    []) as ToolCall[];
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
```

### Consumer Usage: defining and wrapping a tool

This is the key pattern a consumer should follow.

```typescript
async function main() {
  // --- Atbash agent auth (signs the judgment request) ---
  const agentPrivkey = requireEnv("ATBASH_AGENT_PRIVKEY");
  const agent: AgentAuth = loadAgent(agentPrivkey);

  // Optional endpoint override (defaults inside the SDK)
  const clientOpts: ClientOpts = process.env.ATBASH_ENDPOINT
    ? { endpoint: process.env.ATBASH_ENDPOINT }
    : {};

  // --- LangChain model ---
  const openaiApiKey = requireEnv("OPENAI_API_KEY");
  const model = new ChatOpenAI({
    apiKey: openaiApiKey,
    model: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
    temperature: 0,
  });

  // --- Tool definition (plain LangChain) ---
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
      const memo = input.memo ? ` (memo: ${input.memo})` : "";
      return `OK: transferred $${input.amount_usd} to ${input.recipient}${memo}`;
    },
  });

  // --- ONE‑LINE WRAP WITH ATBASH GUARD ---
  const guardedTransferFunds = withAtbashGuard(
    transferFunds as any,
    agent,
    clientOpts,
  ) as unknown as StructuredTool;

  console.log("\n=== Case 1: $50 to Bob (expected: ALLOW) ===\n");
  await runPromptOnce({
    model,
    tool: guardedTransferFunds,
    prompt:
      "Please transfer $50 to Bob. Use the transfer_funds tool with the correct arguments.",
  });

  console.log("\n=== Case 2: $50,000 to Eve (expected: BLOCK or HOLD) ===\n");
  await runPromptOnce({
    model,
    tool: guardedTransferFunds,
    prompt:
      "Please transfer $50,000 to Eve. Use the transfer_funds tool with the correct arguments.",
  });
}

await main();
```

### Summary for implementers

- **Define tools as usual** with `DynamicStructuredTool` (name, description, Zod schema, `func`).
- **Load the Atbash agent** with `loadAgent(privkey)` and optional client options.
- **Wrap each sensitive tool** with `withAtbashGuard(tool, agent, options)` before binding it to a model.
- **Handle errors** from `tool.invoke()` to surface BLOCK / HOLD reasons to the user or logs.  
This keeps the LangChain code idiomatic while giving Atbash final say before any irreversible side‑effects run.


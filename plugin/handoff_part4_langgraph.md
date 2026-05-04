# Atbash Integrations — Handoff Document (Part 4: LangGraph + Build Order)

## PACKAGE: `@atbash/langgraph`

A LangGraph integration that inserts an Atbash safety gate node between the agent and tool execution. Uses LangGraph's native `interrupt()` for HOLD verdicts.

### Dependencies

```json
{
  "name": "@atbash/langgraph",
  "version": "0.1.0",
  "type": "module",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "scripts": {
    "build": "tsup src/index.ts --format esm --dts --clean",
    "test": "vitest run"
  },
  "dependencies": {
    "@atbash/sdk": "^0.3.3"
  },
  "peerDependencies": {
    "@langchain/langgraph": ">=0.2.0",
    "@langchain/core": ">=0.3.0"
  }
}
```

### File structure

```
packages/langgraph/
├── package.json
├── tsconfig.json
├── README.md
└── src/
    ├── index.ts           # Public API exports
    ├── state.ts           # Extended state annotation with Atbash fields
    ├── nodes/
    │   ├── guardNode.ts   # Atbash safety gate (calls judgeAction)
    │   └── auditNode.ts   # Post-tool on-chain logging
    ├── tools/
    │   └── judgeTool.ts    # Atbash as a LangChain tool (optional advisory mode)
    └── builder.ts         # withAtbashSafety() helper
```

### LangGraph Architecture (key concepts for the implementer)

LangGraph models agent workflows as directed graphs:

- **State** — shared data structure passed between nodes. Defined with `Annotation`.
- **Nodes** — async functions that receive state, do work, return state updates.
- **Edges** — control flow (unconditional or conditional based on state).
- **ToolNode** — prebuilt node that executes LangChain tools from LLM tool calls.
- **interrupt()** — pauses graph, persists state, waits for external resume via `Command`.
- **Checkpointer** — persists state across interrupts (e.g., `MemorySaver`).

Standard agent graph: `START → agent → toolsCondition → ToolNode → agent → END`

With Atbash: `START → agent → toolsCondition → atbashGuard → (ALLOW→ToolNode, HOLD→interrupt, BLOCK→agent) → atbashAudit → agent → END`

---

### IMPLEMENTATION: `src/state.ts`

Extend LangGraph's state with Atbash verdict fields:

```typescript
import { Annotation, MessagesAnnotation } from "@langchain/langgraph";

// Extend the standard messages state with Atbash fields
export const AtbashStateAnnotation = Annotation.Root({
  // Inherit messages from MessagesAnnotation
  ...MessagesAnnotation.spec,

  // Atbash-specific fields
  atbashVerdict: Annotation<string | null>({ default: () => null }),
  atbashReason: Annotation<string | null>({ default: () => null }),
  atbashToolCallId: Annotation<string | null>({ default: () => null }),
  atbashConfidence: Annotation<number | null>({ default: () => null }),
});

export type AtbashState = typeof AtbashStateAnnotation.State;
```

### IMPLEMENTATION: `src/nodes/guardNode.ts`

The core safety gate — sits between agent and tools:

```typescript
import { interrupt } from "@langchain/langgraph";
import { AIMessage, ToolMessage } from "@langchain/core/messages";
import { judgeAction, loadAgent, type AgentAuth, type ClientOpts } from "@atbash/sdk";
import type { AtbashState } from "../state.js";

export interface GuardNodeOptions {
  agent: AgentAuth;
  clientOpts?: ClientOpts;
}

export function createGuardNode(opts: GuardNodeOptions) {
  return async (state: AtbashState): Promise<Partial<AtbashState>> => {
    const lastMessage = state.messages[state.messages.length - 1];

    // Extract tool calls from the last AI message
    const toolCalls = (lastMessage as AIMessage).tool_calls || [];
    if (toolCalls.length === 0) {
      return { atbashVerdict: "ALLOW" };
    }

    // Build action description from tool calls
    const actionText = toolCalls
      .map((tc: any) => `${tc.name}(${JSON.stringify(tc.args)})`)
      .join("; ");

    const context = `LangGraph agent attempting: ${actionText}`;

    try {
      const result = await judgeAction(actionText, context, opts.agent, opts.clientOpts);

      if (result.verdict === "HOLD") {
        // Pause the graph — wait for operator approval
        const operatorDecision = interrupt({
          type: "atbash_hold",
          tool_call_id: result.tool_call_id,
          reason: result.reason,
          action: actionText,
          confidence: result.confidence,
        });

        // Resumed — check operator decision
        if (operatorDecision === "approve" || operatorDecision === "ALLOW") {
          return {
            atbashVerdict: "ALLOW",
            atbashReason: "Approved by operator",
            atbashToolCallId: result.tool_call_id,
            atbashConfidence: result.confidence,
          };
        } else {
          // Rejected — inject a tool message so the agent knows
          const rejectMessages = toolCalls.map(
            (tc: any) =>
              new ToolMessage({
                tool_call_id: tc.id,
                content: `Action rejected by operator: ${operatorDecision || "no reason given"}`,
              }),
          );
          return {
            messages: rejectMessages,
            atbashVerdict: "BLOCK",
            atbashReason: `Rejected by operator: ${operatorDecision}`,
            atbashToolCallId: result.tool_call_id,
            atbashConfidence: result.confidence,
          };
        }
      }

      if (result.verdict === "BLOCK") {
        // Inject tool messages so the agent sees the block
        const blockMessages = toolCalls.map(
          (tc: any) =>
            new ToolMessage({
              tool_call_id: tc.id,
              content: `BLOCKED by Atbash safety policy: ${result.reason}`,
            }),
        );
        return {
          messages: blockMessages,
          atbashVerdict: "BLOCK",
          atbashReason: result.reason,
          atbashToolCallId: result.tool_call_id,
          atbashConfidence: result.confidence,
        };
      }

      // ALLOW
      return {
        atbashVerdict: "ALLOW",
        atbashReason: result.reason,
        atbashToolCallId: result.tool_call_id,
        atbashConfidence: result.confidence,
      };
    } catch (err) {
      // On error, default to BLOCK for safety
      const blockMessages = toolCalls.map(
        (tc: any) =>
          new ToolMessage({
            tool_call_id: tc.id,
            content: `Atbash safety check failed: ${err instanceof Error ? err.message : "unknown error"}`,
          }),
      );
      return {
        messages: blockMessages,
        atbashVerdict: "BLOCK",
        atbashReason: err instanceof Error ? err.message : "Safety check failed",
        atbashToolCallId: null,
        atbashConfidence: null,
      };
    }
  };
}
```

### IMPLEMENTATION: `src/nodes/auditNode.ts`

Post-tool logging — records completed actions on-chain:

```typescript
import { logToolCall, type AgentAuth, type ClientOpts } from "@atbash/sdk";
import type { AtbashState } from "../state.js";

export interface AuditNodeOptions {
  agent: AgentAuth;
  clientOpts?: ClientOpts;
}

export function createAuditNode(opts: AuditNodeOptions) {
  return async (state: AtbashState): Promise<Partial<AtbashState>> => {
    // Log the last tool result to the chain
    const lastMessage = state.messages[state.messages.length - 1];
    const content = typeof lastMessage.content === "string"
      ? lastMessage.content
      : JSON.stringify(lastMessage.content);

    try {
      await logToolCall(
        content.slice(0, 500),
        "LangGraph tool execution completed",
        opts.agent,
        undefined,
        undefined,
        opts.clientOpts,
      );
    } catch {
      // Best-effort audit logging
    }

    return {}; // Don't modify state
  };
}
```

### IMPLEMENTATION: `src/builder.ts`

The main consumer-facing helper — wires Atbash into any graph:

```typescript
import { StateGraph, END } from "@langchain/langgraph";
import { loadAgent, type AgentAuth, type ClientOpts } from "@atbash/sdk";
import { createGuardNode } from "./nodes/guardNode.js";
import { createAuditNode } from "./nodes/auditNode.js";
import type { AtbashState } from "./state.js";

export interface AtbashSafetyOptions {
  agent?: AgentAuth;
  privkey?: string;
  endpoint?: string;
}

/**
 * Add Atbash safety to a LangGraph StateGraph.
 *
 * Inserts:
 * - "atbash_guard" node between agent and tools (routes by verdict)
 * - "atbash_audit" node after tools (logs to chain)
 *
 * Usage:
 *   const builder = new StateGraph(AtbashStateAnnotation)
 *     .addNode("agent", agentNode)
 *     .addNode("tools", toolNode);
 *
 *   addAtbashSafety(builder, { privkey: process.env.ATBASH_AGENT_PRIVKEY });
 *
 *   // Then wire your edges — route agent → atbash_guard instead of agent → tools
 */
export function addAtbashSafety(
  builder: StateGraph<AtbashState>,
  opts: AtbashSafetyOptions,
) {
  const agent = opts.agent || loadAgent(opts.privkey || process.env.ATBASH_AGENT_PRIVKEY!);
  const clientOpts: ClientOpts | undefined = opts.endpoint ? { endpoint: opts.endpoint } : undefined;

  // Add guard and audit nodes
  builder.addNode("atbash_guard", createGuardNode({ agent, clientOpts }));
  builder.addNode("atbash_audit", createAuditNode({ agent, clientOpts }));

  // Wire guard → tools (on ALLOW) or back to agent (on BLOCK)
  builder.addConditionalEdges("atbash_guard", (state: AtbashState) => {
    return state.atbashVerdict === "ALLOW" ? "tools" : "agent";
  });

  // Wire tools → audit → agent
  builder.addEdge("tools" as any, "atbash_audit" as any);
  builder.addEdge("atbash_audit" as any, "agent" as any);

  return builder;
}
```

### IMPLEMENTATION: `src/tools/judgeTool.ts` (optional advisory mode)

For agents that prefer to explicitly call Atbash as a tool:

```typescript
import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { judgeAction, type AgentAuth } from "@atbash/sdk";

export function createJudgeTool(agent: AgentAuth, endpoint?: string) {
  return tool(
    async ({ action, context }) => {
      const result = await judgeAction(action, context, agent,
        endpoint ? { endpoint } : undefined);
      return JSON.stringify({
        verdict: result.verdict,
        reason: result.reason,
        confidence: result.confidence,
        tool_call_id: result.tool_call_id,
      });
    },
    {
      name: "atbash_safety_check",
      description: "Check if an action is safe. Call BEFORE any sensitive action.",
      schema: z.object({
        action: z.string().describe("The action to check"),
        context: z.string().describe("Context for the check"),
      }),
    },
  );
}
```

### IMPLEMENTATION: `src/index.ts`

```typescript
export { AtbashStateAnnotation, type AtbashState } from "./state.js";
export { createGuardNode, type GuardNodeOptions } from "./nodes/guardNode.js";
export { createAuditNode, type AuditNodeOptions } from "./nodes/auditNode.js";
export { addAtbashSafety, type AtbashSafetyOptions } from "./builder.js";
export { createJudgeTool } from "./tools/judgeTool.js";
```

### Consumer usage

```typescript
import { StateGraph, START, END, MemorySaver } from "@langchain/langgraph";
import { ToolNode, toolsCondition } from "@langchain/langgraph/prebuilt";
import { AtbashStateAnnotation, addAtbashSafety } from "@atbash/langgraph";

const tools = [myTool1, myTool2];
const toolNode = new ToolNode(tools);

const builder = new StateGraph(AtbashStateAnnotation)
  .addNode("agent", callModel)
  .addNode("tools", toolNode)
  .addEdge(START, "agent")
  // Route to atbash_guard instead of directly to tools
  .addConditionalEdges("agent", (state) => {
    const result = toolsCondition(state);
    return result === "tools" ? "atbash_guard" : "__end__";
  });

// One call adds guard + audit nodes and wires them
addAtbashSafety(builder, {
  privkey: process.env.ATBASH_AGENT_PRIVKEY,
});

const app = builder.compile({
  checkpointer: new MemorySaver(), // REQUIRED for HOLD/interrupt
});

// Normal invocation
const result = await app.invoke(
  { messages: [{ role: "user", content: "Transfer $50k..." }] },
  { configurable: { thread_id: "t1" } },
);

// If HOLD — resume after operator approval:
import { Command } from "@langchain/langgraph";
await app.invoke(
  new Command({ resume: "approve" }),
  { configurable: { thread_id: "t1" } },
);
```

---

## BUILD ORDER & TESTING STRATEGY

### Phase 1: Setup (30 min)
- Create monorepo, root configs, workspace structure
- `npm install` at root

### Phase 2: MCP Server (1-2 days)
- Implement all tools
- Test with: `npx @modelcontextprotocol/inspector node packages/mcp/dist/index.js`
- Verify with Claude Desktop config

### Phase 3: LangGraph (2-3 days)
- Implement guard node, audit node, builder helper
- Test with in-memory graph + MemorySaver
- Test interrupt/resume flow for HOLD verdicts

### Phase 4: ElizaOS Plugin (2-3 days)
- Implement service, action, provider, evaluator
- Test with ElizaOS runtime: `elizaos start`
- Test `withAtbashGuard` wrapper on a sample action

### Phase 5: Examples + Docs (1 day)
- Working example per package in `examples/`
- README per package with install + usage
- Root README linking to all three

### Testing notes
- All packages need `ATBASH_AGENT_PRIVKEY` env var for real tests
- For unit tests without a real agent, mock `@atbash/sdk` functions
- The MCP Inspector is the fastest feedback loop for development
- LangGraph tests can use `MemorySaver` (in-memory, no external deps)
- ElizaOS tests require the ElizaOS runtime (`bun install && elizaos start`)

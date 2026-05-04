# Atbash Integrations — Handoff Document (Part 3: ElizaOS Plugin)

## PACKAGE: `@atbash/eliza-plugin`

An ElizaOS plugin that adds policy enforcement, on-chain audit logging, and safety context to any ElizaOS agent.

### Dependencies

```json
{
  "name": "@atbash/eliza-plugin",
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
    "@elizaos/core": ">=0.2.0"
  }
}
```

### File structure

```
packages/eliza/
├── package.json
├── tsconfig.json
├── README.md
└── src/
    ├── index.ts                # Plugin manifest + withAtbashGuard export
    ├── services/
    │   └── atbashService.ts    # Manages agent identity
    ├── actions/
    │   └── judgeAction.ts      # ATBASH_JUDGE action
    ├── providers/
    │   └── policyProvider.ts   # Injects safety context
    └── evaluators/
        └── auditEvaluator.ts   # Post-action on-chain logging
```

### ElizaOS Plugin System (key concepts for the implementer)

ElizaOS plugins implement the `Plugin` interface from `@elizaos/core`:

```typescript
interface Plugin {
  name: string;
  description: string;
  init?: (config: Record<string, string>, runtime: IAgentRuntime) => Promise<void>;
  config?: { [key: string]: any };
  actions?: Action[];
  providers?: Provider[];
  evaluators?: Evaluator[];
  services?: (typeof Service)[];
}
```

**Four extension points:**

1. **Services** — background processes, stateful connections. Initialized once at startup.
2. **Actions** — things the agent can DO. Have `validate` (pre-check) and `handler` (execution).
3. **Providers** — inject context into agent's prompt. Have a `get()` method returning a string.
4. **Evaluators** — run AFTER a response. Have `validate` and `handler`.

**Key runtime APIs:**
- `runtime.getSetting("KEY")` — reads agent config/env vars
- `runtime.messageManager` — access message history

---

### IMPLEMENTATION: `src/services/atbashService.ts`

Manages the agent's Atbash identity. Created once at startup.

```typescript
import { Service, IAgentRuntime } from "@elizaos/core";
import { loadAgent, checkAgentExists, type AgentAuth, type ClientOpts } from "@atbash/sdk";

export class AtbashService extends Service {
  static serviceType = "atbash";

  private agent: AgentAuth | null = null;
  private clientOpts: ClientOpts = {};

  async initialize(runtime: IAgentRuntime): Promise<void> {
    const privkey = runtime.getSetting("ATBASH_AGENT_PRIVKEY");
    if (!privkey) {
      throw new Error("ATBASH_AGENT_PRIVKEY is required in agent settings");
    }

    this.agent = loadAgent(privkey);

    const endpoint = runtime.getSetting("ATBASH_ENDPOINT");
    if (endpoint) this.clientOpts = { endpoint };

    // Verify agent is onboarded
    const exists = await checkAgentExists(this.agent.pubkey, this.clientOpts);
    if (!exists) {
      console.warn(
        `[Atbash] Agent ${this.agent.pubkey.slice(0, 12)}... is not registered. ` +
        `Onboard at ${this.clientOpts.endpoint || "https://atbash.ai"}/risk-engine/agents`
      );
    }
  }

  getAgent(): AgentAuth {
    if (!this.agent) throw new Error("AtbashService not initialized");
    return this.agent;
  }

  getClientOpts(): ClientOpts {
    return this.clientOpts;
  }
}
```

### IMPLEMENTATION: `src/actions/judgeAction.ts`

An explicit action the agent can invoke, plus the `withAtbashGuard` wrapper.

```typescript
import { Action, IAgentRuntime, Memory, State, HandlerCallback } from "@elizaos/core";
import { judgeAction as sdkJudgeAction, type AgentAuth, type ClientOpts } from "@atbash/sdk";
import { AtbashService } from "../services/atbashService.js";

// The explicit ATBASH_JUDGE action
export const atbashJudgeAction: Action = {
  name: "ATBASH_JUDGE",
  description: "Submit an action for safety judgment before execution",
  similes: ["SAFETY_CHECK", "CHECK_POLICY", "JUDGE_ACTION"],

  validate: async (runtime: IAgentRuntime, message: Memory): Promise<boolean> => {
    const privkey = runtime.getSetting("ATBASH_AGENT_PRIVKEY");
    return !!privkey;
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    state?: State,
    options?: any,
    callback?: HandlerCallback,
  ) => {
    const service = runtime.getService("atbash") as AtbashService;
    const agent = service.getAgent();
    const opts = service.getClientOpts();

    const actionText = message.content?.text || "";
    const context = `ElizaOS agent action: ${actionText}`;

    try {
      const result = await sdkJudgeAction(actionText, context, agent, opts);

      if (callback) {
        callback({
          text: `Safety verdict: **${result.verdict}**\nReason: ${result.reason}\nConfidence: ${result.confidence}`,
        });
      }

      return { success: true, data: result, text: `Verdict: ${result.verdict}` };
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Safety check failed";
      if (callback) callback({ text: `Safety check error: ${msg}` });
      return { success: false, text: msg };
    }
  },

  examples: [
    [
      { user: "{{user1}}", content: { text: "Check if transferring $50k to wallet 0xabc is safe" } },
      { user: "{{agent}}", content: { text: "Let me check with Atbash safety...", action: "ATBASH_JUDGE" } },
    ],
  ],
};

// HIGHER-ORDER FUNCTION: withAtbashGuard
// Wraps any action handler to gate execution on Atbash verdict
export function withAtbashGuard(
  handler: Action["handler"],
): Action["handler"] {
  return async (runtime, message, state, options, callback) => {
    const service = runtime.getService("atbash") as AtbashService;
    const agent = service.getAgent();
    const opts = service.getClientOpts();

    const actionText = message.content?.text || "";
    const context = `ElizaOS guarded action: ${actionText}`;

    try {
      const result = await sdkJudgeAction(actionText, context, agent, opts);

      switch (result.verdict) {
        case "ALLOW":
          // Proceed with the original handler
          return handler(runtime, message, state, options, callback);

        case "HOLD":
          if (callback) {
            callback({
              text: `⏸️ Action held for operator review.\nReason: ${result.reason}\nTool call ID: ${result.tool_call_id}`,
            });
          }
          return { success: false, text: `Held: ${result.reason}` };

        case "BLOCK":
          if (callback) {
            callback({
              text: `🚫 Action blocked by safety policy.\nReason: ${result.reason}`,
            });
          }
          return { success: false, text: `Blocked: ${result.reason}` };

        default:
          // Default to HOLD behavior for safety
          if (callback) callback({ text: `Unknown verdict, holding action for safety.` });
          return { success: false, text: "Unknown verdict" };
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Safety check failed";
      if (callback) callback({ text: `Safety gate error: ${msg}` });
      return { success: false, text: msg };
    }
  };
}
```

### IMPLEMENTATION: `src/providers/policyProvider.ts`

Injects the agent's safety status into the LLM prompt context.

```typescript
import { Provider, IAgentRuntime, Memory, State } from "@elizaos/core";
import { getAgentPolicy, type AgentAuth } from "@atbash/sdk";
import { AtbashService } from "../services/atbashService.js";

export const policyProvider: Provider = {
  name: "atbash-policy",
  description: "Provides the agent's current Atbash safety policy and status",

  get: async (runtime: IAgentRuntime, message: Memory, state?: State): Promise<string> => {
    try {
      const service = runtime.getService("atbash") as AtbashService;
      const agent = service.getAgent();
      const opts = service.getClientOpts();
      const policy = await getAgentPolicy(agent.pubkey, opts);

      return [
        "## Atbash Safety Status",
        `- Policy: ${policy.policy || "none"}`,
        `- Jailed: ${policy.is_jailed ? "YES — cannot execute actions" : "no"}`,
        `- Custom policy: ${policy.is_custom ? "yes" : "no (using default)"}`,
        policy.is_jailed
          ? "⚠️ Agent is JAILED. All actions will be blocked until unjailed via dashboard."
          : "",
      ].filter(Boolean).join("\n");
    } catch {
      return "Atbash safety status: unavailable";
    }
  },
};
```

### IMPLEMENTATION: `src/evaluators/auditEvaluator.ts`

Logs completed actions to the on-chain audit trail.

```typescript
import { Evaluator, IAgentRuntime, Memory } from "@elizaos/core";
import { logToolCall } from "@atbash/sdk";
import { AtbashService } from "../services/atbashService.js";

export const auditEvaluator: Evaluator = {
  name: "atbash-audit",
  description: "Logs completed agent actions to the Atbash on-chain audit trail",

  validate: async (runtime: IAgentRuntime, message: Memory): Promise<boolean> => {
    // Only run if Atbash is configured
    return !!runtime.getSetting("ATBASH_AGENT_PRIVKEY");
  },

  handler: async (runtime: IAgentRuntime, message: Memory): Promise<void> => {
    try {
      const service = runtime.getService("atbash") as AtbashService;
      const agent = service.getAgent();
      const opts = service.getClientOpts();
      const actionText = message.content?.text || "unknown action";

      await logToolCall(actionText, "ElizaOS agent action completed", agent, undefined, undefined, opts);
    } catch {
      // Audit logging is best-effort, don't crash the agent
    }
  },
};
```

### IMPLEMENTATION: `src/index.ts` (Plugin manifest)

```typescript
import { Plugin } from "@elizaos/core";
import { AtbashService } from "./services/atbashService.js";
import { atbashJudgeAction, withAtbashGuard } from "./actions/judgeAction.js";
import { policyProvider } from "./providers/policyProvider.js";
import { auditEvaluator } from "./evaluators/auditEvaluator.js";

export const atbashPlugin: Plugin = {
  name: "@atbash/eliza-plugin",
  description: "Atbash safety layer — policy enforcement and on-chain audit for ElizaOS agents",
  services: [AtbashService],
  actions: [atbashJudgeAction],
  providers: [policyProvider],
  evaluators: [auditEvaluator],
  config: {
    ATBASH_AGENT_PRIVKEY: { required: true, description: "Agent private key (64-hex)" },
    ATBASH_ENDPOINT: { required: false, description: "API endpoint override" },
  },
};

// Re-export the guard wrapper for consumers
export { withAtbashGuard } from "./actions/judgeAction.js";
export { AtbashService } from "./services/atbashService.js";
```

### Consumer usage

```typescript
// character.ts
export const character = {
  name: "SafeBot",
  plugins: ["@atbash/eliza-plugin"],
  settings: {
    ATBASH_AGENT_PRIVKEY: process.env.ATBASH_AGENT_PRIVKEY,
  },
};

// In a custom action, wrap the handler:
import { withAtbashGuard } from "@atbash/eliza-plugin";

const myAction: Action = {
  name: "SEND_FUNDS",
  handler: withAtbashGuard(async (runtime, message, state, options, callback) => {
    // Only runs if Atbash says ALLOW
    await sendFunds(...);
    return { success: true, text: "Sent" };
  }),
  // ...
};
```

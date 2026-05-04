# Atbash Integrations — Handoff Document (Part 1: Setup & SDK Reference)

## OBJECTIVE

Build a monorepo (`atbash-integrations`) containing three separate npm packages that wrap the published `@atbash/sdk` (v0.3.3) for three AI agent frameworks:

1. `@atbash/mcp` — MCP server (Model Context Protocol)
2. `@atbash/eliza-plugin` — ElizaOS plugin
3. `@atbash/langgraph` — LangGraph integration

The SDK is on npm. Install it with `npm install @atbash/sdk`. Do NOT modify the SDK.

---

## MONOREPO SETUP

### Root structure

```
atbash-integrations/
├── package.json
├── tsconfig.base.json
├── packages/
│   ├── common/          # Shared utilities (private, not published)
│   ├── mcp/             # @atbash/mcp
│   ├── eliza/           # @atbash/eliza-plugin
│   └── langgraph/       # @atbash/langgraph
└── examples/
    ├── mcp-demo/
    ├── eliza-demo/
    └── langgraph-demo/
```

### Root `package.json`

```json
{
  "name": "atbash-integrations",
  "private": true,
  "workspaces": ["packages/*"],
  "scripts": {
    "build": "npm run build --workspaces",
    "test": "npm run test --workspaces",
    "build:mcp": "npm run build -w packages/mcp",
    "build:eliza": "npm run build -w packages/eliza",
    "build:langgraph": "npm run build -w packages/langgraph"
  },
  "devDependencies": {
    "typescript": "^5.4.0",
    "tsup": "^8.0.0",
    "vitest": "^1.0.0"
  }
}
```

### Root `tsconfig.base.json`

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "declaration": true,
    "sourceMap": true
  }
}
```

---

## @atbash/sdk — COMPLETE API REFERENCE

The SDK is server-side only (Node.js ≥18). It uses secp256k1 keys for on-chain signing.

### Installation

```bash
npm install @atbash/sdk
```

### All Exported Functions

```typescript
// Constants
export const DEFAULT_ENDPOINT = "https://atbash.ai";
export const DEFAULT_CHROMIA_NODE_URLS: string[];
export const DEFAULT_BLOCKCHAIN_RID: string;

// Identity
export function loadAgent(privkey: string): AgentAuth;
export function generateKeyPair(): { privKey: string; pubKey: string };
export function derivePublicKey(privKeyHex: string): string;
export function isValidPrivateKey(hex: string): boolean;
export function toPubkeyHex(val: unknown): string;

// Core flow
export function checkAgentExists(pubkey: string, opts?: ClientOpts): Promise<boolean>;
export function logToolCall(action: string, context: string, auth: AgentAuth, chainOpts?: ChainOpts, extra?: { toolName?: string; toolArgsJson?: string }, clientOpts?: ClientOpts): Promise<LogToolCallResult>;
export function judgeAction(action: string, context: string, auth: AgentAuth, opts?: JudgeOptions): Promise<JudgeResult>;
export function getJudgmentStatus(judgmentId: string, opts?: ClientOpts): Promise<JudgmentStatus>;

// Query APIs
export function getToolCalls(maxCount: number, opts?: ClientOpts): Promise<ToolCallRecord[]>;
export function getOrgToolCalls(orgName: string, maxCount: number, opts?: ClientOpts): Promise<ToolCallRecord[]>;
export function getAgentToolCalls(agentPubkey: string, maxCount: number, opts?: ClientOpts): Promise<ToolCallRecord[]>;
export function getToolCallCount(opts?: ClientOpts): Promise<number>;
export function getToolCallFull(toolCallId: string, opts?: ClientOpts): Promise<ToolCallFull | null>;
export function getOrgTierInfo(orgName: string, opts?: ClientOpts): Promise<TierInfo | null>;
export function getPendingHeldActions(orgName: string, maxCount: number, opts?: ClientOpts): Promise<HeldAction[]>;
export function getHeldActionReviews(orgName: string, maxCount: number, opts?: ClientOpts): Promise<HeldActionReview[]>;
export function getAgentDetail(agentPubkey: string, opts?: ClientOpts): Promise<Record<string, unknown>>;
export function getAgentPolicy(agentPubkey: string, opts?: ClientOpts): Promise<AgentPolicy>;
export function getSafetyStats(opts?: ClientOpts): Promise<Record<string, unknown>>;
```

### All Types

```typescript
type Verdict = "ALLOW" | "HOLD" | "BLOCK" | "No verdict";
type Provider = "atbash" | "openai" | "google" | "microsoft" | "custom" | (string & {});
type Tier = "audit" | "audit_plus" | "enforcement" | (string & {});
type ActionType = "allow" | "hold_for_user_confirm" | "block" | (string & {});
type PubkeyValue = string | Buffer | { data: number[] };
type JudgmentStatusState = "pending" | "answered" | "error";

interface AgentAuth { pubkey: string; privkey: string; }
interface ClientOpts { endpoint?: string; timeout?: number; }
interface ChainOpts { nodeUrls?: string[]; blockchainRid?: string; }

interface LogToolCallResult {
  success: boolean;
  toolCallId: string | null;
  error?: string;
}

interface JudgeResult {
  verdict: Verdict;
  action_type: ActionType;
  reason: string;
  confidence: number;
  provider: Provider;
  latency_ms: number;
  tool_call_id: string;
  on_chain: boolean;
}

interface JudgeOptions extends ClientOpts {
  provider?: Provider;
  apiKey?: string;
  providerEndpoint?: string;
  model?: string;
  toolName?: string;
  toolArgsJson?: string;
  chainOpts?: ChainOpts;
}

interface JudgmentStatus {
  status: JudgmentStatusState;
  verdict: Verdict;
  reason: string;
  judgmentId: string;
  onChain?: boolean;
  cached?: boolean;
  responseTimeMs?: number;
}

interface TierInfo {
  org_name: string;
  tier: Tier;
  verdict_enabled: boolean;
  enforcement_enabled: boolean;
}

interface ToolCallRecord {
  tool_call_id: string;
  agent_pubkey: PubkeyValue;
  tool_name: string;
  command_text: string;
  tool_args_json: string;
  context_text: string;
  org_name: string;
  rowid: number;
}

interface ToolCallFull {
  tool_call_id: string;
  agent_pubkey: PubkeyValue;
  tool_name: string;
  command_text: string;
  context_text: string;
  tool_args_json?: string;
  org_name: string;
  created_at?: number;
  action_type?: ActionType;
  result_status?: string;
  verdict_color?: string;
  verdict_reason?: string;
  verdict_source?: string;
  verdict_response_time_ms?: number;
}

interface HeldAction {
  judgment_id: string;
  agent_pubkey: PubkeyValue;
  action_text: string;
  action_context: string;
  verdict: Verdict;
  reason: string;
  created_at: number;
}

interface HeldActionReview {
  judgment_id: string;
  action_text: string;
  status: string;
  review_note: string;
  reviewed_by: PubkeyValue | null;
  reviewed_at: number;
  created_at: number;
}

interface AgentPolicy {
  policy: string;
  is_jailed: boolean;
  is_custom: boolean;
  default_policy: string;
}
```

### How `judgeAction()` works (the core flow)

1. Calls `logToolCall()` which signs a `log_tool_call` transaction on the Chromia blockchain using the agent's private key (key never leaves the machine)
2. Sends `POST /api/v1/judge` with `{ tool_call_id, agent_pubkey, action, context, ... }`
3. Returns `JudgeResult` with verdict: `ALLOW`, `HOLD`, or `BLOCK`

Verdicts mean:
- **ALLOW** — safe, proceed with execution
- **HOLD** — requires operator review in Atbash dashboard, poll with `getJudgmentStatus()`
- **BLOCK** — violates policy, do not execute, agent is jailed in Enforcement tier

---

## SHARED `packages/common` PACKAGE

```
packages/common/
├── package.json
├── tsconfig.json
└── src/
    ├── index.ts
    ├── agent.ts       # Agent loading + validation
    └── config.ts      # Env-based config loading
```

### `packages/common/package.json`

```json
{
  "name": "@atbash/integration-common",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "scripts": {
    "build": "tsup src/index.ts --format esm --dts --clean"
  },
  "dependencies": {
    "@atbash/sdk": "^0.3.3"
  }
}
```

### Key shared utilities to implement

```typescript
// agent.ts — wraps loadAgent + checkAgentExists with better errors
export interface AtbashConfig {
  privkey: string;
  endpoint?: string;
  timeout?: number;
}

export function initAgent(config: AtbashConfig): AgentAuth;
export async function validateAgent(agent: AgentAuth, opts?: ClientOpts): Promise<void>;
export function getClientOpts(config: AtbashConfig): ClientOpts;

// config.ts — loads from env vars
export function loadConfigFromEnv(): AtbashConfig;
// Reads: ATBASH_AGENT_PRIVKEY (required), ATBASH_ENDPOINT (optional), ATBASH_TIMEOUT (optional)
```

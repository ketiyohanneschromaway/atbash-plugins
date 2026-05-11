declare module "@atbash/sdk" {
  export const DEFAULT_ENDPOINT: string;
  export const DEFAULT_CHROMIA_NODE_URLS: string[];
  export const DEFAULT_BLOCKCHAIN_RID: string;

  export type Verdict = "ALLOW" | "HOLD" | "BLOCK" | "No verdict";
  export type Provider =
    | "atbash"
    | "openai"
    | "google"
    | "microsoft"
    | "custom"
    | (string & {});
  export type Tier = "audit" | "audit_plus" | "enforcement" | (string & {});
  export type ActionType = "allow" | "hold_for_user_confirm" | "block" | (string & {});
  export type PubkeyValue = string | Buffer | { data: number[] };
  export type JudgmentStatusState = "pending" | "answered" | "error";

  export interface AgentAuth {
    pubkey: string;
    privkey: string;
  }

  export interface ClientOpts {
    endpoint?: string;
    timeout?: number;
  }

  export interface ChainOpts {
    nodeUrls?: string[];
    blockchainRid?: string;
  }

  export interface LogToolCallResult {
    success: boolean;
    toolCallId: string | null;
    error?: string;
  }

  export interface JudgeResult {
    verdict: Verdict;
    action_type: ActionType;
    reason: string;
    confidence: number;
    provider: Provider;
    latency_ms: number;
    tool_call_id: string;
    on_chain: boolean;
  }

  export interface JudgeOptions extends ClientOpts {
    provider?: Provider;
    apiKey?: string;
    providerEndpoint?: string;
    model?: string;
    toolName?: string;
    toolArgsJson?: string;
    chainOpts?: ChainOpts;
  }

  export interface JudgmentStatus {
    status: JudgmentStatusState;
    verdict: Verdict;
    reason: string;
    judgmentId: string;
    onChain?: boolean;
    cached?: boolean;
    responseTimeMs?: number;
  }

  export interface TierInfo {
    org_name: string;
    tier: Tier;
    verdict_enabled: boolean;
    enforcement_enabled: boolean;
  }

  export interface ToolCallRecord {
    tool_call_id: string;
    agent_pubkey: PubkeyValue;
    tool_name: string;
    command_text: string;
    tool_args_json: string;
    context_text: string;
    org_name: string;
    rowid: number;
  }

  export interface ToolCallFull {
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

  export interface HeldAction {
    judgment_id: string;
    agent_pubkey: PubkeyValue;
    action_text: string;
    action_context: string;
    verdict: Verdict;
    reason: string;
    created_at: number;
  }

  export interface HeldActionReview {
    judgment_id: string;
    action_text: string;
    status: string;
    reviewed_at?: number;
    reviewed_by?: string;
    reason?: string;
  }

  export function loadAgent(privkey: string): AgentAuth;
  export function generateKeyPair(): { privKey: string; pubKey: string };
  export function derivePublicKey(privKeyHex: string): string;
  export function isValidPrivateKey(hex: string): boolean;
  export function toPubkeyHex(val: unknown): string;

  export function checkAgentExists(pubkey: string, opts?: ClientOpts): Promise<boolean>;
  export function logToolCall(
    action: string,
    context: string,
    auth: AgentAuth,
    chainOpts?: ChainOpts,
    extra?: { toolName?: string; toolArgsJson?: string },
    clientOpts?: ClientOpts,
  ): Promise<LogToolCallResult>;
  export function judgeAction(
    action: string,
    context: string,
    auth: AgentAuth,
    opts?: JudgeOptions,
  ): Promise<JudgeResult>;
  export function getJudgmentStatus(
    judgmentId: string,
    opts?: ClientOpts,
  ): Promise<JudgmentStatus>;

  export function getToolCalls(maxCount: number, opts?: ClientOpts): Promise<ToolCallRecord[]>;
  export function getOrgToolCalls(
    orgName: string,
    maxCount: number,
    opts?: ClientOpts,
  ): Promise<ToolCallRecord[]>;
  export function getAgentToolCalls(
    agentPubkey: string,
    maxCount: number,
    opts?: ClientOpts,
  ): Promise<ToolCallRecord[]>;
  export function getToolCallCount(opts?: ClientOpts): Promise<number>;
  export function getToolCallFull(
    toolCallId: string,
    opts?: ClientOpts,
  ): Promise<ToolCallFull | null>;
  export function getOrgTierInfo(orgName: string, opts?: ClientOpts): Promise<TierInfo | null>;
  export function getPendingHeldActions(
    orgName: string,
    maxCount: number,
    opts?: ClientOpts,
  ): Promise<HeldAction[]>;
  export function getHeldActionReviews(
    orgName: string,
    maxCount: number,
    opts?: ClientOpts,
  ): Promise<HeldActionReview[]>;
  export function getAgentDetail(
    agentPubkey: string,
    opts?: ClientOpts,
  ): Promise<Record<string, unknown>>;
  export function getAgentPolicy(
    agentPubkey: string,
    opts?: ClientOpts,
  ): Promise<Record<string, unknown>>;
  export function getSafetyStats(opts?: ClientOpts): Promise<Record<string, unknown>>;

  // ── High-level audit client API (SDK 0.3.8+) ───────────────────────────
  export type DecisionVerdict = "ALLOW" | "HOLD" | "BLOCK" | "ERROR";

  export interface Decision {
    allow: boolean;
    verdict: DecisionVerdict;
    reason?: string;
    toolCallId?: string;
  }

  export interface ToolCallInput {
    toolName: string;
    args?: unknown;
    context?: string;
  }

  export interface ValidatedEndpoint {
    url: string;
    policy: "default" | "self-hosted";
    verifyPubKey: string | null;
  }

  export type JudgeEndpointConfig =
    | { policy?: "default"; endpoint?: string }
    | { policy: "self-hosted"; endpoint: string; verifyPubKey: string };

  export interface AtbashClientConfig {
    judge?: JudgeEndpointConfig;
    nodeUrls?: string[];
    blockchainRid?: string;
    keyPath?: string;
    keyPair?: AgentAuth;
    failClosed?: boolean;
    logger?: { info?: (...args: unknown[]) => void; warn?: (...args: unknown[]) => void };
  }

  export interface AtbashClient {
    auditToolCall(input: ToolCallInput): Promise<Decision>;
  }

  export function createAtbashClient(config?: AtbashClientConfig): AtbashClient;
}

import { vi } from "vitest";

export const DEFAULT_ENDPOINT = "https://atbash.ai";
export const DEFAULT_CHROMIA_NODE_URLS: string[] = [];
export const DEFAULT_BLOCKCHAIN_RID = "mock-blockchain";

export const loadAgent = vi.fn();
export const generateKeyPair = vi.fn();
export const derivePublicKey = vi.fn();
export const isValidPrivateKey = vi.fn();
export const toPubkeyHex = vi.fn();

export const checkAgentExists = vi.fn();
export const logToolCall = vi.fn();
export const judgeAction = vi.fn();
export const getJudgmentStatus = vi.fn();

export const getToolCalls = vi.fn();
export const getOrgToolCalls = vi.fn();
export const getAgentToolCalls = vi.fn();
export const getToolCallCount = vi.fn();
export const getToolCallFull = vi.fn();
export const getOrgTierInfo = vi.fn();
export const getPendingHeldActions = vi.fn();
export const getHeldActionReviews = vi.fn();
export const getAgentDetail = vi.fn();
export const getAgentPolicy = vi.fn();
export const getSafetyStats = vi.fn();

import type { AgentAuth } from "@atbash/sdk";
import {
  getAgentDetail,
  getAgentPolicy,
  getAgentToolCalls,
  getHeldActionReviews,
  getOrgTierInfo,
  getOrgToolCalls,
  getPendingHeldActions,
  getSafetyStats,
  getToolCallCount,
  getToolCallFull,
  getToolCalls,
} from "@atbash/sdk";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { createClientOpts, toErrorContent, toJsonContent } from "@atbash/common";

function defaultMaxCount(value?: number) {
  return value ?? 20;
}

export function registerQueryTools(
  server: McpServer,
  agent: AgentAuth,
  endpoint?: string,
) {
  const opts = createClientOpts(endpoint);

  server.registerTool(
    "atbash_get_policy",
    {
      description: "Get an agent policy configuration and jail status.",
      inputSchema: z.object({
        pubkey: z.string().optional().describe("Agent public key, defaults to the server agent"),
      }),
    },
    async ({ pubkey }) => {
      try {
        return toJsonContent(await getAgentPolicy(pubkey ?? agent.pubkey, opts));
      } catch (error) {
        return toErrorContent(error);
      }
    },
  );

  server.registerTool(
    "atbash_get_agent_detail",
    {
      description: "Get agent metadata for a public key.",
      inputSchema: z.object({
        pubkey: z.string().optional().describe("Agent public key, defaults to the server agent"),
      }),
    },
    async ({ pubkey }) => {
      try {
        return toJsonContent(await getAgentDetail(pubkey ?? agent.pubkey, opts));
      } catch (error) {
        return toErrorContent(error);
      }
    },
  );

  server.registerTool(
    "atbash_get_tool_calls",
    {
      description: "List recent tool calls across all agents.",
      inputSchema: z.object({
        max_count: z.number().int().positive().optional().describe("Maximum number of records"),
      }),
    },
    async ({ max_count }) => {
      try {
        return toJsonContent(await getToolCalls(defaultMaxCount(max_count), opts));
      } catch (error) {
        return toErrorContent(error);
      }
    },
  );

  server.registerTool(
    "atbash_get_agent_tool_calls",
    {
      description: "List recent tool calls for one agent.",
      inputSchema: z.object({
        pubkey: z.string().optional().describe("Agent public key, defaults to the server agent"),
        max_count: z.number().int().positive().optional().describe("Maximum number of records"),
      }),
    },
    async ({ pubkey, max_count }) => {
      try {
        return toJsonContent(
          await getAgentToolCalls(pubkey ?? agent.pubkey, defaultMaxCount(max_count), opts),
        );
      } catch (error) {
        return toErrorContent(error);
      }
    },
  );

  server.registerTool(
    "atbash_get_org_tool_calls",
    {
      description: "List recent tool calls for an organization.",
      inputSchema: z.object({
        org_name: z.string().describe("Organization name"),
        max_count: z.number().int().positive().optional().describe("Maximum number of records"),
      }),
    },
    async ({ org_name, max_count }) => {
      try {
        return toJsonContent(await getOrgToolCalls(org_name, defaultMaxCount(max_count), opts));
      } catch (error) {
        return toErrorContent(error);
      }
    },
  );

  server.registerTool(
    "atbash_get_tool_call_full",
    {
      description: "Get the full detail for a single tool call.",
      inputSchema: z.object({
        tool_call_id: z.string().describe("Tool call identifier"),
      }),
    },
    async ({ tool_call_id }) => {
      try {
        return toJsonContent(await getToolCallFull(tool_call_id, opts));
      } catch (error) {
        return toErrorContent(error);
      }
    },
  );

  server.registerTool(
    "atbash_get_tool_call_count",
    {
      description: "Get the total number of tool calls on-chain.",
      inputSchema: z.object({}),
    },
    async () => {
      try {
        return toJsonContent({ count: await getToolCallCount(opts) });
      } catch (error) {
        return toErrorContent(error);
      }
    },
  );

  server.registerTool(
    "atbash_get_tier_info",
    {
      description: "Get an organization's tier information.",
      inputSchema: z.object({
        org_name: z.string().describe("Organization name"),
      }),
    },
    async ({ org_name }) => {
      try {
        return toJsonContent(await getOrgTierInfo(org_name, opts));
      } catch (error) {
        return toErrorContent(error);
      }
    },
  );

  server.registerTool(
    "atbash_get_held_actions",
    {
      description: "List actions currently waiting for operator review.",
      inputSchema: z.object({
        org_name: z.string().describe("Organization name"),
        max_count: z.number().int().positive().optional().describe("Maximum number of records"),
      }),
    },
    async ({ org_name, max_count }) => {
      try {
        return toJsonContent(
          await getPendingHeldActions(org_name, defaultMaxCount(max_count), opts),
        );
      } catch (error) {
        return toErrorContent(error);
      }
    },
  );

  server.registerTool(
    "atbash_get_reviews",
    {
      description: "List completed operator reviews for held actions.",
      inputSchema: z.object({
        org_name: z.string().describe("Organization name"),
        max_count: z.number().int().positive().optional().describe("Maximum number of records"),
      }),
    },
    async ({ org_name, max_count }) => {
      try {
        return toJsonContent(await getHeldActionReviews(org_name, defaultMaxCount(max_count), opts));
      } catch (error) {
        return toErrorContent(error);
      }
    },
  );

  server.registerTool(
    "atbash_get_safety_stats",
    {
      description: "Get high-level chain-wide safety statistics.",
      inputSchema: z.object({}),
    },
    async () => {
      try {
        return toJsonContent(await getSafetyStats(opts));
      } catch (error) {
        return toErrorContent(error);
      }
    },
  );
}

import { beforeEach, describe, expect, it, vi } from "vitest";
import * as sdkMocks from "../../../test-support/mock-atbash-sdk.js";
import { registerSafetyPrompt } from "./prompts/safety.js";
import { registerPolicyResource } from "./resources/policy.js";
import { registerJudgeTools } from "./tools/judge.js";
import { registerQueryTools } from "./tools/queries.js";
import { registerStatusTools } from "./tools/status.js";

type ToolRegistration = {
  config: unknown;
  handler: (input: Record<string, unknown>) => Promise<unknown>;
};

function createFakeServer() {
  const tools = new Map<string, ToolRegistration>();
  const resources = new Map<string, ToolRegistration>();
  const prompts = new Map<string, ToolRegistration>();

  return {
    tools,
    resources,
    prompts,
    registerTool(name: string, config: unknown, handler: ToolRegistration["handler"]) {
      tools.set(name, { config, handler });
    },
    registerResource(name: string, config: unknown, handler: ToolRegistration["handler"]) {
      resources.set(name, { config, handler });
    },
    registerPrompt(name: string, config: unknown, handler: ToolRegistration["handler"]) {
      prompts.set(name, { config, handler });
    },
  };
}

describe("mcp registrations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("registers judge, log, and check-agent tools and forwards SDK options", async () => {
    const server = createFakeServer();
    const agent = { pubkey: "agent-pubkey", privkey: "agent-privkey" };

    sdkMocks.judgeAction.mockResolvedValue({ verdict: "ALLOW", reason: "ok", confidence: 0.9 });
    sdkMocks.logToolCall.mockResolvedValue({ success: true, toolCallId: "tc-1" });
    sdkMocks.checkAgentExists.mockResolvedValue(true);

    registerJudgeTools(server as never, agent, "https://atbash.example");

    expect(server.tools.has("atbash_judge")).toBe(true);
    expect(server.tools.has("atbash_log")).toBe(true);
    expect(server.tools.has("atbash_check_agent")).toBe(true);

    const judgeResult = await server.tools.get("atbash_judge")!.handler({
      action: "Transfer funds",
      context: "Customer payout",
      provider: "openai",
      model: "gpt-4o-mini",
      tool_name: "wallet.send",
      tool_args_json: "{\"amount\":10}",
    });

    expect(sdkMocks.judgeAction).toHaveBeenCalledWith("Transfer funds", "Customer payout", agent, {
      endpoint: "https://atbash.example",
      provider: "openai",
      model: "gpt-4o-mini",
      toolName: "wallet.send",
      toolArgsJson: "{\"amount\":10}",
    });
    expect(judgeResult).toMatchObject({
      content: [{ type: "text" }],
    });

    await server.tools.get("atbash_log")!.handler({
      action: "Transfer funds",
      context: "Customer payout",
      tool_name: "wallet.send",
      tool_args_json: "{\"amount\":10}",
    });

    expect(sdkMocks.logToolCall).toHaveBeenCalledWith(
      "Transfer funds",
      "Customer payout",
      agent,
      undefined,
      {
        toolName: "wallet.send",
        toolArgsJson: "{\"amount\":10}",
      },
      { endpoint: "https://atbash.example" },
    );

    await server.tools.get("atbash_check_agent")!.handler({});
    expect(sdkMocks.checkAgentExists).toHaveBeenCalledWith("agent-pubkey", {
      endpoint: "https://atbash.example",
    });
  });

  it("registers query, status, resource, and prompt helpers", async () => {
    const server = createFakeServer();
    const agent = { pubkey: "agent-pubkey", privkey: "agent-privkey" };

    sdkMocks.getJudgmentStatus.mockResolvedValue({ status: "answered", verdict: "ALLOW" });
    sdkMocks.getToolCalls.mockResolvedValue([{ tool_call_id: "tc-1" }]);
    sdkMocks.getAgentPolicy.mockResolvedValue({ policy: "default", is_jailed: false });
    sdkMocks.getAgentDetail.mockResolvedValue({ org: "demo" });
    sdkMocks.getAgentToolCalls.mockResolvedValue([]);
    sdkMocks.getOrgToolCalls.mockResolvedValue([]);
    sdkMocks.getToolCallFull.mockResolvedValue({ tool_call_id: "tc-1" });
    sdkMocks.getToolCallCount.mockResolvedValue(12);
    sdkMocks.getOrgTierInfo.mockResolvedValue({ tier: "audit_plus" });
    sdkMocks.getPendingHeldActions.mockResolvedValue([]);
    sdkMocks.getHeldActionReviews.mockResolvedValue([]);
    sdkMocks.getSafetyStats.mockResolvedValue({ total: 1 });

    registerStatusTools(server as never, "https://atbash.example");
    registerQueryTools(server as never, agent, "https://atbash.example");
    registerPolicyResource(server as never, agent, "https://atbash.example");
    registerSafetyPrompt(server as never);

    await server.tools.get("atbash_judgment_status")!.handler({ tool_call_id: "tc-1" });
    expect(sdkMocks.getJudgmentStatus).toHaveBeenCalledWith("tc-1", {
      endpoint: "https://atbash.example",
    });

    await server.tools.get("atbash_get_tool_calls")!.handler({});
    expect(sdkMocks.getToolCalls).toHaveBeenCalledWith(20, {
      endpoint: "https://atbash.example",
    });

    await server.tools.get("atbash_get_policy")!.handler({});
    expect(sdkMocks.getAgentPolicy).toHaveBeenCalledWith("agent-pubkey", {
      endpoint: "https://atbash.example",
    });

    const resourceResult = await server.resources.get("atbash_policy")!.handler({});
    expect(resourceResult).toMatchObject({
      contents: [
        {
          uri: "atbash://policy/agent-pubkey",
          mimeType: "application/json",
        },
      ],
    });

    const promptResult = await server.prompts.get("atbash_safety_check")!.handler({
      action: "Delete ledger row",
      context: "Customer requested cleanup",
    });

    expect(promptResult).toMatchObject({
      messages: [
        {
          role: "user",
        },
      ],
    });
  });
});

import { beforeEach, describe, expect, it, vi } from "vitest";
import * as sdkMocks from "../../../test-support/mock-atbash-sdk.js";
import { atbashJudgeAction, withAtbashGuard } from "./actions/judgeAction.js";
import { auditEvaluator } from "./evaluators/auditEvaluator.js";
import { atbashPlugin } from "./index.js";
import { policyProvider } from "./providers/policyProvider.js";
import { AtbashService } from "./services/atbashService.js";

describe("eliza integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sdkMocks.loadAgent.mockReturnValue({ pubkey: "agent-pubkey", privkey: "agent-privkey" });
    sdkMocks.checkAgentExists.mockResolvedValue(true);
  });

  it("initializes the Atbash service from runtime settings", async () => {
    const runtime = {
      getSetting(key: string) {
        if (key === "ATBASH_AGENT_PRIVKEY") return "privkey-123";
        if (key === "ATBASH_ENDPOINT") return "https://atbash.example";
        return null;
      },
    };

    const service = new AtbashService();
    await service.initialize(runtime as never);

    expect(sdkMocks.loadAgent).toHaveBeenCalledWith("privkey-123");
    expect(sdkMocks.checkAgentExists).toHaveBeenCalledWith("agent-pubkey", {
      endpoint: "https://atbash.example",
    });
    expect(service.getAgent()).toEqual({ pubkey: "agent-pubkey", privkey: "agent-privkey" });
  });

  it("runs the explicit judge action and returns a verdict", async () => {
    sdkMocks.judgeAction.mockResolvedValue({
      verdict: "ALLOW",
      reason: "safe",
      confidence: 0.93,
      tool_call_id: "tc-1",
    });

    const callback = vi.fn(async () => []);
    const runtime = {
      getService: () => ({
        getAgent: () => ({ pubkey: "agent-pubkey", privkey: "agent-privkey" }),
        getClientOpts: () => ({ endpoint: "https://atbash.example" }),
      }),
      getSetting: () => "privkey-123",
    };

    const result = await atbashJudgeAction.handler(
      runtime as never,
      { content: { text: "Send a payment" } } as never,
      undefined,
      undefined,
      callback,
    );

    expect(sdkMocks.judgeAction).toHaveBeenCalledWith(
      "Send a payment",
      "ElizaOS agent action: Send a payment",
      { pubkey: "agent-pubkey", privkey: "agent-privkey" },
      { endpoint: "https://atbash.example" },
    );
    expect(callback).toHaveBeenCalled();
    expect(result).toMatchObject({ success: true, text: "Verdict: ALLOW" });
  });

  it("guards custom actions based on Atbash verdicts", async () => {
    const callback = vi.fn(async () => []);
    const runtime = {
      getService: () => ({
        getAgent: () => ({ pubkey: "agent-pubkey", privkey: "agent-privkey" }),
        getClientOpts: () => ({}),
      }),
    };

    const innerHandler = vi.fn(async () => ({ success: true, text: "Executed" }));
    const guarded = withAtbashGuard(innerHandler);

    sdkMocks.judgeAction.mockResolvedValueOnce({
      verdict: "ALLOW",
      reason: "safe",
      tool_call_id: "tc-1",
    });
    const allowResult = await guarded(runtime as never, { content: { text: "Transfer" } } as never, undefined, undefined, callback);
    expect(innerHandler).toHaveBeenCalled();
    expect(allowResult).toMatchObject({ success: true, text: "Executed" });

    sdkMocks.judgeAction.mockResolvedValueOnce({
      verdict: "HOLD",
      reason: "review needed",
      tool_call_id: "tc-2",
    });
    const holdResult = await guarded(runtime as never, { content: { text: "Transfer" } } as never, undefined, undefined, callback);
    expect(holdResult).toMatchObject({ success: false, text: "Held: review needed" });

    sdkMocks.judgeAction.mockResolvedValueOnce({
      verdict: "BLOCK",
      reason: "policy violation",
      tool_call_id: "tc-3",
    });
    const blockResult = await guarded(runtime as never, { content: { text: "Transfer" } } as never, undefined, undefined, callback);
    expect(blockResult).toMatchObject({ success: false, text: "Blocked: policy violation" });
  });

  it("provides policy context and audit logging", async () => {
    sdkMocks.getAgentPolicy.mockResolvedValue({
      policy: "default",
      is_jailed: false,
      is_custom: true,
    });

    const runtime = {
      getService: () => ({
        getAgent: () => ({ pubkey: "agent-pubkey", privkey: "agent-privkey" }),
        getClientOpts: () => ({ endpoint: "https://atbash.example" }),
      }),
      getSetting: () => "privkey-123",
    };

    const policyText = await policyProvider.get(
      runtime as never,
      { content: { text: "Hello" } } as never,
      {} as never,
    );

    expect(policyText.text).toContain("Policy: default");

    await auditEvaluator.handler(runtime as never, { content: { text: "Completed action" } } as never);
    expect(sdkMocks.logToolCall).toHaveBeenCalledWith(
      "Completed action",
      "ElizaOS agent action completed",
      { pubkey: "agent-pubkey", privkey: "agent-privkey" },
      undefined,
      undefined,
      { endpoint: "https://atbash.example" },
    );
  });

  it("exports the plugin manifest", () => {
    expect(atbashPlugin.name).toBe("@atbash/eliza-plugin");
    expect(atbashPlugin.actions).toContain(atbashJudgeAction);
    expect(atbashPlugin.providers).toContain(policyProvider);
    expect(atbashPlugin.evaluators).toContain(auditEvaluator);
  });
});

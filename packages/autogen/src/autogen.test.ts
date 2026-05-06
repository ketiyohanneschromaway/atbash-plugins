import { beforeEach, describe, expect, it, vi } from "vitest";
import * as sdkMocks from "../../../test-support/mock-atbash-sdk.js";
import { judgeForAutoGen } from "./index.js";

describe("autogen integration helpers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("forwards action/context and tool metadata to judgeAction", async () => {
    sdkMocks.judgeAction.mockResolvedValue({
      verdict: "ALLOW",
      reason: "safe",
      confidence: 0.93,
      tool_call_id: "tc-autogen-1",
    });

    const result = await judgeForAutoGen(
      {
        action: "Transfer $101 to approved wallet",
        context: "Treasury payout",
        toolName: "transfer_funds",
        toolArgs: { amount: 101, destination: "0xabc" },
      },
      { pubkey: "agent-pubkey", privkey: "agent-privkey" },
      { endpoint: "https://atbash.example" },
    );

    expect(result.verdict).toBe("ALLOW");
    expect(sdkMocks.judgeAction).toHaveBeenCalledWith(
      "Transfer $101 to approved wallet",
      "Treasury payout",
      { pubkey: "agent-pubkey", privkey: "agent-privkey" },
      {
        endpoint: "https://atbash.example",
        toolName: "transfer_funds",
        toolArgsJson: JSON.stringify({ amount: 101, destination: "0xabc" }),
      },
    );
  });

  it("rejects empty action/context", async () => {
    await expect(
      judgeForAutoGen(
        { action: "", context: "ctx" },
        { pubkey: "agent-pubkey", privkey: "agent-privkey" },
      ),
    ).rejects.toThrow("Both action and context are required");
  });
});

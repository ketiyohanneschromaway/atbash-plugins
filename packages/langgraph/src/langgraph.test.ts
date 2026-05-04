import { AIMessage } from "@langchain/core/messages";
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as sdkMocks from "../../../test-support/mock-atbash-sdk.js";

const langgraphMocks = vi.hoisted(() => ({
  interrupt: vi.fn(),
}));

vi.mock("@langchain/langgraph", async () => {
  const actual = await vi.importActual<typeof import("@langchain/langgraph")>("@langchain/langgraph");
  return {
    ...actual,
    interrupt: langgraphMocks.interrupt,
  };
});

import { createAuditNode } from "./nodes/auditNode.js";
import { createGuardNode } from "./nodes/guardNode.js";
import { addAtbashSafety } from "./builder.js";
import { createJudgeTool } from "./tools/judgeTool.js";

describe("langgraph integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sdkMocks.loadAgent.mockReturnValue({ pubkey: "agent-pubkey", privkey: "agent-privkey" });
  });

  it("allows states without tool calls", async () => {
    const guardNode = createGuardNode({
      agent: { pubkey: "agent-pubkey", privkey: "agent-privkey" },
    });

    const result = await guardNode({
      messages: [new AIMessage("No tool calls here")],
      atbashVerdict: null,
      atbashReason: null,
      atbashToolCallId: null,
      atbashConfidence: null,
    } as never);

    expect(result).toMatchObject({
      atbashVerdict: "ALLOW",
      atbashReason: "No tool calls detected",
    });
  });

  it("blocks tool calls when the SDK returns BLOCK", async () => {
    sdkMocks.judgeAction.mockResolvedValue({
      verdict: "BLOCK",
      reason: "policy violation",
      confidence: 0.2,
      tool_call_id: "tc-1",
    });

    const guardNode = createGuardNode({
      agent: { pubkey: "agent-pubkey", privkey: "agent-privkey" },
      clientOpts: { endpoint: "https://atbash.example" },
    });

    const result = await guardNode({
      messages: [
        new AIMessage({
          content: "Call a tool",
          tool_calls: [{ id: "tool-1", name: "send_funds", args: { amount: 50 } }],
        }),
      ],
      atbashVerdict: null,
      atbashReason: null,
      atbashToolCallId: null,
      atbashConfidence: null,
    } as never);

    expect(sdkMocks.judgeAction).toHaveBeenCalled();
    expect(result).toMatchObject({
      atbashVerdict: "BLOCK",
      atbashReason: "policy violation",
      atbashToolCallId: "tc-1",
    });
    expect(Array.isArray(result.messages)).toBe(true);
  });

  it("handles HOLD with operator approval or rejection", async () => {
    sdkMocks.judgeAction.mockResolvedValue({
      verdict: "HOLD",
      reason: "needs review",
      confidence: 0.4,
      tool_call_id: "tc-2",
    });

    const guardNode = createGuardNode({
      agent: { pubkey: "agent-pubkey", privkey: "agent-privkey" },
    });

    const state = {
      messages: [
        new AIMessage({
          content: "Call a tool",
          tool_calls: [{ id: "tool-1", name: "send_funds", args: { amount: 50 } }],
        }),
      ],
      atbashVerdict: null,
      atbashReason: null,
      atbashToolCallId: null,
      atbashConfidence: null,
    } as never;

    langgraphMocks.interrupt.mockReturnValueOnce("approve");
    const approved = await guardNode(state);
    expect(approved).toMatchObject({
      atbashVerdict: "ALLOW",
      atbashReason: "Approved by operator",
    });

    langgraphMocks.interrupt.mockReturnValueOnce("reject");
    const rejected = await guardNode(state);
    expect(rejected).toMatchObject({
      atbashVerdict: "BLOCK",
    });
  });

  it("logs tool output in the audit node", async () => {
    const auditNode = createAuditNode({
      agent: { pubkey: "agent-pubkey", privkey: "agent-privkey" },
      clientOpts: { endpoint: "https://atbash.example" },
    });

    await auditNode({
      messages: [{ content: "x".repeat(700) }],
      atbashVerdict: null,
      atbashReason: null,
      atbashToolCallId: null,
      atbashConfidence: null,
    } as never);

    expect(sdkMocks.logToolCall).toHaveBeenCalled();
    const firstArg = sdkMocks.logToolCall.mock.calls[0][0] as string;
    expect(firstArg.length).toBeLessThanOrEqual(500);
  });

  it("wires the builder helper and exposes the advisory tool", async () => {
    const builderCalls: Array<[string, ...unknown[]]> = [];
    const builder = {
      addNode(name: string, node: unknown) {
        builderCalls.push(["addNode", name, node]);
        return this;
      },
      addConditionalEdges(name: string, route: unknown) {
        builderCalls.push(["addConditionalEdges", name, route]);
        return this;
      },
      addEdge(from: string, to: string) {
        builderCalls.push(["addEdge", from, to]);
        return this;
      },
    };

    addAtbashSafety(builder as never, {
      privkey: "privkey-123",
      endpoint: "https://atbash.example",
    });

    expect(sdkMocks.loadAgent).toHaveBeenCalledWith("privkey-123");
    expect(builderCalls.map(([name]) => name)).toEqual([
      "addNode",
      "addNode",
      "addConditionalEdges",
      "addEdge",
      "addEdge",
    ]);

    sdkMocks.judgeAction.mockResolvedValue({
      verdict: "ALLOW",
      reason: "safe",
      confidence: 0.88,
      tool_call_id: "tc-3",
    });

    const judgeTool = createJudgeTool(
      { pubkey: "agent-pubkey", privkey: "agent-privkey" },
      "https://atbash.example",
    );

    const output = await judgeTool.invoke({
      action: "Transfer funds",
      context: "Customer payout",
    });

    expect(JSON.parse(output as string)).toMatchObject({
      verdict: "ALLOW",
      tool_call_id: "tc-3",
    });
  });
});

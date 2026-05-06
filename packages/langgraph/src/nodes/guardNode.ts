import { judgeAction, type AgentAuth, type ClientOpts } from "@atbash/sdk";
import { AIMessage, ToolMessage } from "@langchain/core/messages";
import { interrupt, isGraphBubbleUp } from "@langchain/langgraph";
import type { AtbashState } from "../state.js";

type ToolCall = {
  id: string;
  name: string;
  args: unknown;
};

export interface GuardNodeOptions {
  agent: AgentAuth;
  clientOpts?: ClientOpts;
}

export function createGuardNode(opts: GuardNodeOptions) {
  return async (state: AtbashState): Promise<Partial<AtbashState>> => {
    const lastMessage = state.messages[state.messages.length - 1];
    const toolCalls = (((lastMessage as AIMessage | undefined)?.tool_calls ?? []) as ToolCall[]);

    if (toolCalls.length === 0) {
      return {
        atbashVerdict: "ALLOW",
        atbashReason: "No tool calls detected",
      };
    }

    const actionText = toolCalls
      .map((toolCall) => `${toolCall.name}(${JSON.stringify(toolCall.args)})`)
      .join("; ");

    try {
      const result = await judgeAction(
        actionText,
        `LangGraph agent attempting: ${actionText}`,
        opts.agent,
        opts.clientOpts,
      );

      if (result.verdict === "HOLD") {
        const operatorDecision = interrupt({
          type: "atbash_hold",
          tool_call_id: result.tool_call_id,
          reason: result.reason,
          action: actionText,
          confidence: result.confidence,
        });

        if (operatorDecision === "approve" || operatorDecision === "ALLOW") {
          return {
            atbashVerdict: "ALLOW",
            atbashReason: "Approved by operator",
            atbashToolCallId: result.tool_call_id,
            atbashConfidence: result.confidence,
          };
        }

        return {
          messages: toolCalls.map(
            (toolCall) =>
              new ToolMessage({
                tool_call_id: toolCall.id,
                content: `Action rejected by operator: ${String(operatorDecision ?? "no reason given")}`,
              }),
          ),
          atbashVerdict: "BLOCK",
          atbashReason: `Rejected by operator: ${String(operatorDecision ?? "unknown")}`,
          atbashToolCallId: result.tool_call_id,
          atbashConfidence: result.confidence,
        };
      }

      if (result.verdict === "BLOCK") {
        return {
          messages: toolCalls.map(
            (toolCall) =>
              new ToolMessage({
                tool_call_id: toolCall.id,
                content: `BLOCKED by Atbash safety policy: ${result.reason}`,
              }),
          ),
          atbashVerdict: "BLOCK",
          atbashReason: result.reason,
          atbashToolCallId: result.tool_call_id,
          atbashConfidence: result.confidence,
        };
      }

      return {
        atbashVerdict: "ALLOW",
        atbashReason: result.reason,
        atbashToolCallId: result.tool_call_id,
        atbashConfidence: result.confidence,
      };
    } catch (error) {
      if (isGraphBubbleUp(error)) {
        throw error;
      }

      const reason = error instanceof Error ? error.message : "Safety check failed";
      return {
        messages: toolCalls.map(
          (toolCall) =>
            new ToolMessage({
              tool_call_id: toolCall.id,
              content: `Atbash safety check failed: ${reason}`,
            }),
        ),
        atbashVerdict: "BLOCK",
        atbashReason: reason,
        atbashToolCallId: null,
        atbashConfidence: null,
      };
    }
  };
}

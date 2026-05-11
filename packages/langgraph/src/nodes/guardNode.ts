import type { AtbashClient } from "@atbash/sdk";
import { AIMessage, ToolMessage } from "@langchain/core/messages";
import { isGraphBubbleUp } from "@langchain/langgraph";
import type { AtbashState } from "../state.js";

type ToolCall = {
  id: string;
  name: string;
  args: unknown;
};

export interface GuardNodeOptions {
  client: AtbashClient;
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
      const decision = await opts.client.auditToolCall({
        toolName: toolCalls.map((t) => t.name).join(",") || "langgraph_batch",
        args: toolCalls,
        context: `LangGraph agent attempting: ${actionText}`,
      });

      if (decision.verdict === "BLOCK" || decision.verdict === "ERROR") {
        return {
          messages: toolCalls.map(
            (toolCall) =>
              new ToolMessage({
                tool_call_id: toolCall.id,
                content: `BLOCKED by Atbash safety policy: ${decision.reason ?? "no reason"}`,
              }),
          ),
          atbashVerdict: "BLOCK",
          atbashReason: decision.reason ?? "blocked by Atbash",
          atbashToolCallId: decision.toolCallId,
          atbashConfidence: null,
        };
      }

      return {
        atbashVerdict: "ALLOW",
        atbashReason: decision.reason,
        atbashToolCallId: decision.toolCallId,
        atbashConfidence: null,
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

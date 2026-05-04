import { logToolCall, type AgentAuth, type ClientOpts } from "@atbash/sdk";
import { truncateText } from "@atbash/common";
import type { AtbashState } from "../state.js";

export interface AuditNodeOptions {
  agent: AgentAuth;
  clientOpts?: ClientOpts;
}

export function createAuditNode(opts: AuditNodeOptions) {
  return async (state: AtbashState): Promise<Partial<AtbashState>> => {
    const lastMessage = state.messages[state.messages.length - 1];
    const content =
      typeof lastMessage?.content === "string"
        ? lastMessage.content
        : JSON.stringify(lastMessage?.content ?? "");

    try {
      await logToolCall(
        truncateText(content, 500),
        "LangGraph tool execution completed",
        opts.agent,
        undefined,
        undefined,
        opts.clientOpts,
      );
    } catch {
      // Best-effort audit logging.
    }

    return {};
  };
}

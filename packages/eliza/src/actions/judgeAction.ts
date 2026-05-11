import {
  type Action,
  type HandlerCallback,
  type IAgentRuntime,
  type Memory,
  type State,
} from "@elizaos/core";
import { AtbashService } from "../services/atbashService.js";

export const atbashJudgeAction: Action = {
  name: "ATBASH_JUDGE",
  description: "Submit an action for safety judgment before execution",
  similes: ["SAFETY_CHECK", "CHECK_POLICY", "JUDGE_ACTION"],
  validate: async (runtime: IAgentRuntime): Promise<boolean> => {
    return !!runtime.getSetting("ATBASH_AGENT_PRIVKEY");
  },
  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    state?: State,
    options?: Record<string, unknown>,
    callback?: HandlerCallback,
  ) => {
    void state;
    void options;

    try {
      const service = runtime.getService("atbash") as AtbashService;
      const decision = await service.getClient().auditToolCall({
        toolName: "elizaos_judge",
        args: { text: message.content?.text ?? "" },
        context: `ElizaOS agent action: ${message.content?.text ?? ""}`,
      });

      callback?.({
        text: `Safety verdict: ${decision.verdict}\nReason: ${decision.reason ?? "no reason"}`,
      });

      return {
        success: decision.verdict !== "ERROR",
        data: decision,
        text: `Verdict: ${decision.verdict}`,
      };
    } catch (error) {
      const text = error instanceof Error ? error.message : "Safety check failed";
      callback?.({ text: `Safety check error: ${text}` });
      return {
        success: false,
        text,
      };
    }
  },
  examples: [
    [
      { user: "{{user1}}", content: { text: "Check if transferring $50k is safe" } },
      { user: "{{agent}}", content: { text: "Let me check with Atbash safety.", action: "ATBASH_JUDGE" } },
    ],
  ],
};

export function withAtbashGuard(handler: Action["handler"]): Action["handler"] {
  return async (runtime, message, state, options, callback) => {
    try {
      const service = runtime.getService("atbash") as AtbashService;
      const actionText = message.content?.text ?? "";
      const decision = await service.getClient().auditToolCall({
        toolName: "elizaos_action",
        args: { text: actionText },
        context: `ElizaOS guarded action: ${actionText}`,
      });

      switch (decision.verdict) {
        case "ALLOW":
        case "HOLD":
          return handler?.(runtime, message, state, options, callback);
        case "BLOCK":
          callback?.({
            text: `Action blocked by safety policy.\nReason: ${decision.reason ?? "no reason"}`,
          });
          return { success: false, text: `Blocked: ${decision.reason ?? "no reason"}` };
        case "ERROR":
          callback?.({
            text: `Atbash safety check error: ${decision.reason ?? "unknown error"}`,
          });
          return { success: false, text: `Error: ${decision.reason ?? "unknown error"}` };
        default:
          callback?.({
            text: `Unexpected verdict from Atbash (${String(decision.verdict)}). Holding action for safety.`,
          });
          return { success: false, text: `Unexpected verdict: ${String(decision.verdict)}` };
      }
    } catch (error) {
      const text = error instanceof Error ? error.message : "Safety gate failed";
      callback?.({ text: `Safety gate error: ${text}` });
      return { success: false, text };
    }
  };
}

import { judgeAction as sdkJudgeAction } from "@atbash/sdk";
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
      const result = await sdkJudgeAction(
        message.content?.text ?? "",
        `ElizaOS agent action: ${message.content?.text ?? ""}`,
        service.getAgent(),
        service.getClientOpts(),
      );

      callback?.({
        text: `Safety verdict: ${result.verdict}\nReason: ${result.reason}\nConfidence: ${result.confidence}`,
      });

      return {
        success: true,
        data: result,
        text: `Verdict: ${result.verdict}`,
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
      const result = await sdkJudgeAction(
        actionText,
        `ElizaOS guarded action: ${actionText}`,
        service.getAgent(),
        service.getClientOpts(),
      );

      switch (result.verdict) {
        case "ALLOW":
          return handler?.(runtime, message, state, options, callback);
        case "HOLD":
          callback?.({
            text: `Action held for operator review.\nReason: ${result.reason}\nTool call ID: ${result.tool_call_id}`,
          });
          return { success: false, text: `Held: ${result.reason}` };
        case "BLOCK":
          callback?.({
            text: `Action blocked by safety policy.\nReason: ${result.reason}`,
          });
          return { success: false, text: `Blocked: ${result.reason}` };
        default:
          callback?.({
            text: `Unexpected verdict from Atbash (${result.verdict}). Holding action for safety.`,
          });
          return { success: false, text: `Unexpected verdict: ${result.verdict}` };
      }
    } catch (error) {
      const text = error instanceof Error ? error.message : "Safety gate failed";
      callback?.({ text: `Safety gate error: ${text}` });
      return { success: false, text };
    }
  };
}

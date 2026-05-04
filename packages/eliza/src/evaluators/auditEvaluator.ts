import { logToolCall } from "@atbash/sdk";
import {
  type Evaluator,
  type IAgentRuntime,
  type Memory,
} from "@elizaos/core";
import { AtbashService } from "../services/atbashService.js";

export const auditEvaluator: Evaluator = {
  name: "atbash-audit",
  description: "Logs completed agent actions to the Atbash on-chain audit trail",
  validate: async (runtime: IAgentRuntime): Promise<boolean> => {
    return !!runtime.getSetting("ATBASH_AGENT_PRIVKEY");
  },
  handler: async (runtime: IAgentRuntime, message: Memory): Promise<void> => {
    try {
      const service = runtime.getService("atbash") as AtbashService;
      await logToolCall(
        message.content?.text ?? "unknown action",
        "ElizaOS agent action completed",
        service.getAgent(),
        undefined,
        undefined,
        service.getClientOpts(),
      );
    } catch {
      // Audit logging is best-effort and should never crash the agent.
    }
  },
};

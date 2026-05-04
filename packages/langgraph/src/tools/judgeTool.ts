import { judgeAction, type AgentAuth } from "@atbash/sdk";
import { tool } from "@langchain/core/tools";
import { z } from "zod";

export function createJudgeTool(agent: AgentAuth, endpoint?: string) {
  return tool(
    async ({ action, context }) => {
      const result = await judgeAction(
        action,
        context,
        agent,
        endpoint ? { endpoint } : undefined,
      );

      return JSON.stringify({
        verdict: result.verdict,
        reason: result.reason,
        confidence: result.confidence,
        tool_call_id: result.tool_call_id,
      });
    },
    {
      name: "atbash_safety_check",
      description: "Check whether an action is safe before executing it.",
      schema: z.object({
        action: z.string().describe("Action to evaluate"),
        context: z.string().describe("Context for the action"),
      }),
    },
  );
}

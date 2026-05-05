import { judgeAction, type AgentAuth, type ClientOpts, type JudgeResult } from "@atbash/sdk";

export type AutoGenJudgeInput = {
  action: string;
  context: string;
  toolName?: string;
  toolArgs?: unknown;
};

export async function judgeForAutoGen(
  input: AutoGenJudgeInput,
  agent: AgentAuth,
  clientOpts: ClientOpts = {},
): Promise<JudgeResult> {
  const action = input.action?.trim();
  const context = input.context?.trim();

  if (!action || !context) {
    throw new Error("Both action and context are required");
  }

  return judgeAction(action, context, agent, {
    ...clientOpts,
    toolName: input.toolName,
    toolArgsJson: JSON.stringify(input.toolArgs ?? {}),
  });
}

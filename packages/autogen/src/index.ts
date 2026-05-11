import type { AtbashClient, Decision } from "@atbash/sdk";

export type AutoGenJudgeInput = {
  action: string;
  context: string;
  toolName?: string;
  toolArgs?: unknown;
};

/**
 * Submit an AutoGen-style action to the Atbash judge for evaluation.
 *
 * Uses the high-level `AtbashClient.auditToolCall` so the call inherits
 * secret redaction, endpoint validation, fail-closed defaults, and the
 * normalised `Decision` shape from the SDK.
 *
 * The user-supplied human-readable `action` description is forwarded to
 * the judge alongside the caller's own `context` string, while the
 * structured `toolArgs` become the action payload the redactor scans
 * and the judge evaluates.
 */
export async function judgeForAutoGen(
  input: AutoGenJudgeInput,
  client: AtbashClient,
): Promise<Decision> {
  const action = input.action?.trim();
  const context = input.context?.trim();

  if (!action || !context) {
    throw new Error("Both action and context are required");
  }

  return client.auditToolCall({
    toolName: input.toolName ?? "autogen_action",
    args: input.toolArgs ?? { action },
    context: `${action} — ${context}`,
  });
}

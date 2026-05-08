import type { AtbashClient } from "@atbash/sdk";
import type { DynamicStructuredTool } from "@langchain/core/tools";

/**
 * Wraps a LangChain `DynamicStructuredTool` so every invocation is first judged by Atbash.
 *
 * This mutates `tool.func` in-place (preserving the same tool instance).
 *
 * - **ALLOW**: executes the original tool `func`
 * - **BLOCK**: throws an Error with the block reason
 * - **HOLD**: throws an Error whose message contains the `tool_call_id`
 *
 * Construct the `AtbashClient` once at startup and reuse it for every
 * tool you wrap — the client caches the agent identity and signing
 * context, applies secret redaction before signing, validates the
 * judge endpoint, and normalises verdicts.
 */
export function withAtbashGuard(
  tool: DynamicStructuredTool,
  client: AtbashClient,
): DynamicStructuredTool {
  const originalFunc = tool.func.bind(tool);

  tool.func = (async (input: unknown, ...rest: unknown[]) => {
    const decision = await client.auditToolCall({
      toolName: tool.name,
      args: input,
      context: tool.description,
    });

    switch (decision.verdict) {
      case "ALLOW":
        return await (originalFunc as any)(input, ...rest);
      case "BLOCK": {
        const reason = decision.reason || "Blocked by Atbash policy";
        throw new Error(reason);
      }
      case "HOLD": {
        const toolCallId = decision.toolCallId || "missing_tool_call_id";
        throw new Error(`Execution Held: Operator must review tool_call_id: ${toolCallId}`);
      }
      case "ERROR":
        throw new Error(`Atbash API Error: ${decision.reason ?? "unknown"}`);
      default:
        throw new Error(`Unexpected Atbash verdict: ${String(decision.verdict)} (Reason: ${decision.reason ?? "no reason"})`);
    }
  }) as any;

  return tool;
}

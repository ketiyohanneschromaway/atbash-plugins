import { judgeAction, type AgentAuth, type JudgeOptions, type JudgeResult } from "@atbash/sdk";
import type { DynamicStructuredTool } from "@langchain/core/tools";

function safeStringify(value: unknown): string {
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

/**
 * Wraps a LangChain `DynamicStructuredTool` so every invocation is first judged by Atbash.
 *
 * This mutates `tool.func` in-place (preserving the same tool instance).
 *
 * - **ALLOW**: executes the original tool `func`
 * - **BLOCK**: throws an Error with the block reason
 * - **HOLD**: throws an Error whose message contains the `tool_call_id`
 */
export function withAtbashGuard(
  tool: DynamicStructuredTool,
  agent: any,
  options: any,
): DynamicStructuredTool {
  const originalFunc = tool.func.bind(tool);

  tool.func = (async (input: unknown, ...rest: unknown[]) => {
    const argsJson = safeStringify(input);
    
    // 1. Clearer descriptions for the Atbash judge
    const actionDesc = `Calling tool '${tool.name}' with arguments: ${argsJson}`;
    const context = tool.description; // Use the tool's actual description as the context!

    const result = (await judgeAction(
      actionDesc,
      context,
      agent as AgentAuth,
      options as JudgeOptions | undefined,
    )) as JudgeResult & { error?: string };

    // 2. Catch Atbash API errors directly
    if (result.error) {
      throw new Error(`Atbash API Error: ${result.error}`);
    }

    // 3. Enforce the verdict
    switch (result.verdict) {
      case "ALLOW":
        return await (originalFunc as any)(input, ...rest);
      case "BLOCK": {
        const reason = result.reason || "Blocked by Atbash policy";
        throw new Error(reason);
      }
      case "HOLD": {
        const toolCallId = result.tool_call_id || "missing_tool_call_id";
        throw new Error(`Execution Held: Operator must review tool_call_id: ${toolCallId}`);
      }
      default:
        throw new Error(`Unexpected Atbash verdict: ${String(result.verdict)} (Reason: ${result.reason})`);
    }
  }) as any;

  return tool;
}


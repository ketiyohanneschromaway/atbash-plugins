import { getAgentPolicy } from "@atbash/sdk";
import {
  type IAgentRuntime,
  type Memory,
  type Provider,
  type ProviderResult,
  type State,
} from "@elizaos/core";
import { AtbashService } from "../services/atbashService.js";

export const policyProvider: Provider = {
  name: "atbash-policy",
  description: "Provides the agent's current Atbash safety policy and jail status",
  get: async (
    runtime: IAgentRuntime,
    message: Memory,
    state?: State,
  ): Promise<ProviderResult> => {
    void message;
    void state;

    try {
      const service = runtime.getService("atbash") as AtbashService;
      const agent = service.getAgent();
      const policy = await getAgentPolicy(agent.pubkey, service.getClientOpts());
      const policyRecord = policy as Record<string, unknown>;

      const text = [
        "## Atbash Safety Status",
        `- Policy: ${String(policyRecord.policy ?? "none")}`,
        `- Jailed: ${policyRecord.is_jailed ? "yes" : "no"}`,
        `- Custom policy: ${policyRecord.is_custom ? "yes" : "no"}`,
      ].join("\n");

      return {
        text,
        data: policyRecord,
      };
    } catch {
      return {
        text: "Atbash safety status: unavailable",
      };
    }
  },
};

import { checkAgentExists, loadAgent, type AgentAuth, type ClientOpts } from "@atbash/sdk";
import { Service, type IAgentRuntime } from "@elizaos/core";

export class AtbashService extends Service {
  static serviceType = "atbash";
  capabilityDescription = "Atbash agent identity, signed policy checks, and audit logging";

  private agent: AgentAuth | null = null;
  private clientOpts: ClientOpts = {};

  static async start(runtime: IAgentRuntime): Promise<AtbashService> {
    const service = new AtbashService(runtime);
    await service.initialize(runtime);
    return service;
  }

  async initialize(runtime: IAgentRuntime): Promise<void> {
    const rawPrivkey = runtime.getSetting("ATBASH_AGENT_PRIVKEY");
    if (typeof rawPrivkey !== "string" || rawPrivkey.length === 0) {
      throw new Error("ATBASH_AGENT_PRIVKEY is required in agent settings");
    }

    this.agent = loadAgent(rawPrivkey);

    const endpoint = runtime.getSetting("ATBASH_ENDPOINT");
    if (typeof endpoint === "string" && endpoint.length > 0) {
      this.clientOpts = { endpoint };
    }

    const exists = await checkAgentExists(this.agent.pubkey, this.clientOpts);
    if (!exists) {
      console.warn(
        `[Atbash] Agent ${this.agent.pubkey.slice(0, 12)}... is not registered. Onboard it at ${(this.clientOpts.endpoint ?? "https://atbash.ai")}/risk-engine/agents`,
      );
    }
  }

  getAgent(): AgentAuth {
    if (!this.agent) {
      throw new Error("AtbashService not initialized");
    }

    return this.agent;
  }

  getClientOpts(): ClientOpts {
    return this.clientOpts;
  }

  async stop(): Promise<void> {
    this.agent = null;
    this.clientOpts = {};
  }
}

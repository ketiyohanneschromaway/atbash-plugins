import {
  checkAgentExists,
  createAtbashClient,
  loadAgent,
  type AgentAuth,
  type AtbashClient,
  type ClientOpts,
} from "@atbash/sdk";
import { Service, type IAgentRuntime } from "@elizaos/core";

export class AtbashService extends Service {
  static serviceType = "atbash";
  capabilityDescription = "Atbash agent identity, signed policy checks, and audit logging";

  private agent: AgentAuth | null = null;
  private client: AtbashClient | null = null;
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

    // Construct a single AtbashClient that the judge action and the
    // withAtbashGuard helper both use. The client caches the agent
    // identity + signing context, applies secret redaction before
    // signing, validates the judge endpoint, and normalises verdicts.
    this.client = createAtbashClient({
      keyPair: { privKey: this.agent.privkey, pubKey: this.agent.pubkey },
      judge: this.clientOpts.endpoint ? { endpoint: this.clientOpts.endpoint } : undefined,
    });

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

  getClient(): AtbashClient {
    if (!this.client) {
      throw new Error("AtbashService not initialized");
    }

    return this.client;
  }

  getClientOpts(): ClientOpts {
    return this.clientOpts;
  }

  async stop(): Promise<void> {
    this.agent = null;
    this.client = null;
    this.clientOpts = {};
  }
}

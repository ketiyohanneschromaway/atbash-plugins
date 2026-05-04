import { loadAgent, type AgentAuth, type ClientOpts } from "@atbash/sdk";
import { StateGraph } from "@langchain/langgraph";
import { createAuditNode } from "./nodes/auditNode.js";
import { createGuardNode } from "./nodes/guardNode.js";
import type { AtbashState } from "./state.js";

export interface AtbashSafetyOptions {
  agent?: AgentAuth;
  privkey?: string;
  endpoint?: string;
}

export function addAtbashSafety(
  builder: StateGraph<AtbashState>,
  opts: AtbashSafetyOptions,
) {
  const privkey = opts.privkey ?? process.env.ATBASH_AGENT_PRIVKEY;
  const agent = opts.agent ?? loadAgent(privkey ?? "");
  const clientOpts: ClientOpts | undefined = opts.endpoint ? { endpoint: opts.endpoint } : undefined;
  const graph = builder as {
    addNode: (name: string, node: unknown) => unknown;
    addConditionalEdges: (name: string, route: (state: AtbashState) => string) => unknown;
    addEdge: (from: string, to: string) => unknown;
  };

  graph.addNode("atbash_guard", createGuardNode({ agent, clientOpts }));
  graph.addNode("atbash_audit", createAuditNode({ agent, clientOpts }));

  graph.addConditionalEdges("atbash_guard", (state: AtbashState) => {
    return state.atbashVerdict === "ALLOW" ? "tools" : "agent";
  });

  graph.addEdge("tools", "atbash_audit");
  graph.addEdge("atbash_audit", "agent");

  return builder;
}

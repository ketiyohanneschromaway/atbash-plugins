import { HumanMessage } from "@langchain/core/messages";
import { StateGraph, END, START, MemorySaver } from "@langchain/langgraph";
import { ToolNode, toolsCondition } from "@langchain/langgraph/prebuilt";
import { AtbashStateAnnotation, addAtbashSafety } from "../../packages/langgraph/dist/index.js";

declare const agentNode: (state: typeof AtbashStateAnnotation.State) => Promise<unknown>;
declare const existingTools: unknown[];

const toolNode = new ToolNode(existingTools as never);

const builder = new StateGraph(AtbashStateAnnotation)
  .addNode("agent", agentNode as never)
  .addNode("tools", toolNode)
  .addEdge(START, "agent")
  .addConditionalEdges("agent", (state) => {
    const next = toolsCondition(state);
    return next === "tools" ? "atbash_guard" : END;
  });

addAtbashSafety(builder, {
  privkey: process.env.ATBASH_AGENT_PRIVKEY,
  endpoint: process.env.ATBASH_ENDPOINT,
});

export const app = builder.compile({
  checkpointer: new MemorySaver(),
});

await app.invoke(
  {
    messages: [new HumanMessage("Run a sensitive tool action safely")],
  },
  {
    configurable: { thread_id: "existing-langgraph-app" },
  },
);

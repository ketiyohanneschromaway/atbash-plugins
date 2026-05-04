import { AIMessage, HumanMessage } from "@langchain/core/messages";
import { tool } from "@langchain/core/tools";
import { END, MemorySaver, START, StateGraph } from "@langchain/langgraph";
import { ToolNode, toolsCondition } from "@langchain/langgraph/prebuilt";
import { z } from "zod";
import { AtbashStateAnnotation, addAtbashSafety } from "../../packages/langgraph/dist/index.js";

if (!process.env.ATBASH_AGENT_PRIVKEY) {
  console.error("Set ATBASH_AGENT_PRIVKEY before running the LangGraph demo.");
  process.exit(1);
}

const echoTool = tool(
  async ({ text }) => `Echo tool executed with: ${text}`,
  {
    name: "echo_tool",
    description: "Simple demo tool",
    schema: z.object({
      text: z.string(),
    }),
  },
);

async function agentNode(state) {
  const lastMessage = state.messages[state.messages.length - 1];

  if (lastMessage?.type === "tool") {
    return {
      messages: [new AIMessage("Tool execution completed.")],
    };
  }

  return {
    messages: [
      new AIMessage({
        content: "Calling the echo tool through the Atbash guard.",
        tool_calls: [
          {
            id: "call_echo_1",
            name: "echo_tool",
            args: { text: "hello from langgraph" },
          },
        ],
      }),
    ],
  };
}

const builder = new StateGraph(AtbashStateAnnotation)
  .addNode("agent", agentNode)
  .addNode("tools", new ToolNode([echoTool]))
  .addEdge(START, "agent")
  .addConditionalEdges("agent", (state) => {
    const next = toolsCondition(state);
    return next === "tools" ? "atbash_guard" : END;
  });

addAtbashSafety(builder, {
  privkey: process.env.ATBASH_AGENT_PRIVKEY,
  endpoint: process.env.ATBASH_ENDPOINT,
});

const app = builder.compile({
  checkpointer: new MemorySaver(),
});

const result = await app.invoke(
  {
    messages: [new HumanMessage("Run the guarded echo tool")],
  },
  {
    configurable: { thread_id: "langgraph-demo-thread" },
  },
);

console.log(JSON.stringify(result, null, 2));

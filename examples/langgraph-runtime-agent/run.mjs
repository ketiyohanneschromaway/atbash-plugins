import { loadAgent } from "@atbash/sdk";
import { AIMessage, HumanMessage, ToolMessage } from "@langchain/core/messages";
import {
  Command,
  END,
  isInterrupted,
  MemorySaver,
  START,
  StateGraph,
} from "@langchain/langgraph";
import { AtbashStateAnnotation, addAtbashSafety } from "@atbash/langgraph";

const DEFAULT_ATBASH_AGENT_PRIVKEY =
  "f7fb37278c1283cc925d97ca4fffba7b02aeb2eb4817ec406c520599d683d76a";

const atbashPrivkey = process.env.ATBASH_AGENT_PRIVKEY ?? DEFAULT_ATBASH_AGENT_PRIVKEY;
const atbashEndpoint = process.env.ATBASH_ENDPOINT;
const requestedAction =
  process.argv.slice(2).join(" ").trim() ||
  "Bank transfer $25 to a new external vendor account for urgent reimbursement";

const threadId = "langgraph-atbash-example";
const agent = loadAgent(atbashPrivkey);

function extractLatestUserRequest(messages) {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];
    if (message instanceof HumanMessage) {
      return typeof message.content === "string" ? message.content : JSON.stringify(message.content);
    }
  }
  return "Transfer $25 to a new external wallet 0xabc for urgent vendor reimbursement";
}

async function agentNode(state) {
  const lastMessage = state.messages[state.messages.length - 1];

  if (lastMessage instanceof ToolMessage) {
    const summary =
      typeof lastMessage.content === "string"
        ? lastMessage.content
        : JSON.stringify(lastMessage.content);

    return {
      messages: [
        new AIMessage(`Tool phase completed. Final agent response: ${summary}`),
      ],
    };
  }

  const userRequest = extractLatestUserRequest(state.messages);

  return {
    messages: [
      new AIMessage({
        content: `Preparing treasury bank transfer request: ${userRequest}`,
        tool_calls: [
          {
            id: "send-funds-call-1",
            name: "send_bank_transfer",
            args: {
              request: userRequest,
            },
          },
        ],
      }),
    ],
  };
}

async function toolsNode(state) {
  const lastMessage = state.messages[state.messages.length - 1];
  const toolCalls = lastMessage?.tool_calls ?? [];

  if (toolCalls.length === 0) {
    return { messages: [] };
  }

  return {
    messages: toolCalls.map(
      (toolCall) =>
        new ToolMessage({
          tool_call_id: toolCall.id,
          content: `Simulated transfer tool executed for request: ${toolCall.args.request}`,
        }),
    ),
  };
}

const builder = new StateGraph(AtbashStateAnnotation)
  .addNode("agent", agentNode)
  .addNode("tools", toolsNode)
  .addEdge(START, "agent")
  .addConditionalEdges("agent", (state) => {
    const lastMessage = state.messages[state.messages.length - 1];
    const hasToolCalls = lastMessage instanceof AIMessage && (lastMessage.tool_calls?.length ?? 0) > 0;
    return hasToolCalls ? "atbash_guard" : END;
  });

addAtbashSafety(builder, {
  privkey: atbashPrivkey,
  endpoint: atbashEndpoint,
});

const app = builder.compile({
  checkpointer: new MemorySaver(),
});

async function main() {
  console.log("Atbash agent pubkey:", agent.pubkey);
  console.log("Action text:", requestedAction);

  const firstResult = await app.invoke(
    {
      messages: [new HumanMessage(requestedAction)],
    },
    {
      configurable: { thread_id: threadId },
    },
  );

  console.log("\n[First Invoke]");
  console.dir(firstResult, { depth: null });

  if (!isInterrupted(firstResult)) {
    console.log("\nNo HOLD interrupt. Final state above.");
    return;
  }

  const holdPayload = firstResult.__interrupt__[0]?.value;
  console.log("\n[Hold Interrupt]");
  console.dir(holdPayload, { depth: null });

  const approvedResult = await app.invoke(new Command({ resume: "approve" }), {
    configurable: { thread_id: threadId },
  });

  console.log("\n[After Operator Approve]");
  console.dir(approvedResult, { depth: null });
}

main().catch((error) => {
  console.error("\n[Example Error]");
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});

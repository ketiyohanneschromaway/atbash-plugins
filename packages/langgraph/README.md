# `@atbash/langgraph`

Add Atbash as a guard node inside a LangGraph workflow.

Use this when your agent already has a graph with an `agent` step and a `tools` step, and you want Atbash to decide before tool execution.

## What This Plugin Adds

- `AtbashStateAnnotation`
  LangGraph state with Atbash verdict fields.
- `createGuardNode()`
  Calls Atbash before tool execution.
- `createAuditNode()`
  Logs post-tool output.
- `addAtbashSafety()`
  Wires guard and audit nodes into an existing graph.
- `createJudgeTool()`
  Optional advisory tool for direct LLM/tool use.

## Runtime Model

Recommended flow:

1. `agent` node proposes tool calls
2. graph routes to `atbash_guard`
3. verdict:
   - `ALLOW` → `tools`
   - `HOLD` → graph interrupt
   - `BLOCK` → return control with block context
4. `atbash_audit` logs after real tool execution

## Basic Wiring

```ts
import { StateGraph, START, END, MemorySaver } from "@langchain/langgraph";
import { AtbashStateAnnotation, addAtbashSafety } from "@atbash/langgraph";

const builder = new StateGraph(AtbashStateAnnotation)
  .addNode("agent", agentNode)
  .addNode("tools", toolsNode)
  .addEdge(START, "agent")
  .addConditionalEdges("agent", (state) => {
    const hasToolCalls = state.messages.at(-1)?.tool_calls?.length;
    return hasToolCalls ? "atbash_guard" : END;
  });

addAtbashSafety(builder, {
  privkey: process.env.ATBASH_AGENT_PRIVKEY,
  endpoint: process.env.ATBASH_ENDPOINT,
});

const app = builder.compile({
  checkpointer: new MemorySaver(),
});
```

## HOLD Behavior

This package uses native LangGraph interrupt flow.

On `HOLD`:

- graph pauses
- interrupt payload includes `tool_call_id`, reason, action, confidence
- your app resumes with operator decision

Resume pattern:

```ts
import { Command } from "@langchain/langgraph";

await app.invoke(new Command({ resume: "approve" }), config);
```

## What To Do With Verdicts

- `ALLOW`
  Let graph continue to tools.
- `HOLD`
  Pause graph and resume only after operator decision.
- `BLOCK`
  Keep tool from running and return block context to agent.

## Recommended Pattern

- use this for workflows where tool execution is already graph-controlled
- persist state with a checkpointer if you want durable human review
- keep tool names and arguments descriptive so Atbash sees useful action text

## Example

- [examples/langgraph-runtime-agent/README.md](/Users/ketiyohannes/Documents/development/work/Chromaway/atbash-plugins/examples/langgraph-runtime-agent/README.md)

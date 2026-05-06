# `@atbash/langgraph`

LangGraph integration that inserts an Atbash guard before tool execution and an audit node after tools run.

It expects an Atbash private key or preloaded agent, then lets the SDK handle signature-based agent identification and blockchain writes for guard and audit operations.

## When To Use This Package

Use this when you already have a LangGraph app and want to add Atbash around tool execution rather than rebuilding the graph from scratch.

## Install

```bash
npm install @atbash/langgraph @atbash/sdk
```

## Required Environment

- `ATBASH_AGENT_PRIVKEY`
- `ATBASH_ENDPOINT` optional

## Main Exports

- `AtbashStateAnnotation`
- `createGuardNode()`
- `createAuditNode()`
- `addAtbashSafety()`
- `createJudgeTool()`

## Existing Graph Example

If you already have a graph with an `agent` node and a `tools` node, wire Atbash in between:

```ts
import { StateGraph, START, END, MemorySaver } from "@langchain/langgraph";
import { ToolNode, toolsCondition } from "@langchain/langgraph/prebuilt";
import { AtbashStateAnnotation, addAtbashSafety } from "@atbash/langgraph";

const builder = new StateGraph(AtbashStateAnnotation)
  .addNode("agent", agentNode)
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

const app = builder.compile({
  checkpointer: new MemorySaver(),
});
```

## What Happens At Runtime

1. Your model decides to call a tool
2. The graph routes to `atbash_guard`
3. Atbash returns `ALLOW`, `HOLD`, or `BLOCK`
4. `ALLOW` continues to the tool node
5. `HOLD` interrupts the graph for operator review
6. `BLOCK` returns control to the agent with blocking context
7. `atbash_audit` logs the post-tool result

## Example Files

- [examples/langgraph-demo/existing-graph.ts](/Users/ketiyohannes/Documents/development/work/Chromaway/atbash-plugins/examples/langgraph-demo/existing-graph.ts)
- [examples/langgraph-demo/app.mjs](/Users/ketiyohannes/Documents/development/work/Chromaway/atbash-plugins/examples/langgraph-demo/app.mjs)
- [examples/langgraph-demo/README.md](/Users/ketiyohannes/Documents/development/work/Chromaway/atbash-plugins/examples/langgraph-demo/README.md)

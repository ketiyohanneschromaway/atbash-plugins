# `@atbash/langgraph`

Add Atbash as a guard stage inside a LangGraph workflow.

This package is for graph-based agents that already separate planning from tool execution.

## What It Is

This is the LangGraph-native integration.

It adds a safety node before tools run and an audit node after tool execution completes.

## When To Use It

Use this package when:

- your app already uses LangGraph
- your graph already has a distinct `agent` phase and `tools` phase
- you want `HOLD` to pause execution using LangGraph interrupt semantics
- you want audit logging after the tool phase

## What It Adds

- `AtbashStateAnnotation`
  State shape with Atbash fields such as verdict, reason, confidence, and tool call id.
- `createGuardNode()`
  Calls Atbash before tool execution.
- `createAuditNode()`
  Best-effort logging after tool execution.
- `addAtbashSafety()`
  Convenience wiring for the common guard-and-audit pattern.
- `createJudgeTool()`
  Optional advisory tool for direct LLM access.

## Runtime Model

Normal flow:

1. `agent` proposes one or more tool calls
2. graph routes to `atbash_guard`
3. Atbash returns a verdict
4. on `ALLOW`, graph continues to `tools`
5. on `HOLD`, graph interrupts and waits for operator input
6. on `BLOCK`, tool execution is prevented
7. after `tools`, `atbash_audit` logs the completed action

## Important Assumption

`addAtbashSafety()` is a convenience helper for the common graph layout used in this repo.

It assumes:

- a node named `agent`
- a node named `tools`
- tool execution should flow back to `agent` after `atbash_audit`

If your graph shape differs, use `createGuardNode()` and `createAuditNode()` directly and wire them yourself.

## HOLD Behavior

This package uses real LangGraph interrupts.

On `HOLD`:

- graph pauses
- interrupt payload includes `tool_call_id`, reason, action, confidence
- your app decides whether to resume

Resume pattern:

```ts
import { Command } from "@langchain/langgraph";

await app.invoke(new Command({ resume: "approve" }), config);
```

If the operator does not approve, the guard node returns a blocked tool response back into graph state.

## How To Use It Properly

Best results come when:

- tool names clearly describe what will happen
- tool arguments are specific and human-readable
- you use a checkpointer if human review may happen later
- you guard the tool phase, not just the model-output phase

## Verdict Handling

- `ALLOW`
  Continue to the tools node.
- `HOLD`
  Pause graph and wait for operator decision.
- `BLOCK`
  Return block context and do not run the tool.

## What This Package Does Not Do

- It does not invent your graph structure.
- It does not automatically find your tool node if you use a custom layout.
- It does not execute operator review by itself. It only exposes pause/resume mechanics.

## Example

- [examples/langgraph-runtime-agent/README.md](/Users/ketiyohannes/Documents/development/work/Chromaway/atbash-plugins/examples/langgraph-runtime-agent/README.md)

# `@atbash/langgraph`

LangGraph integration that inserts an Atbash guard before tool execution and an audit node after tools run.

It expects an Atbash private key or preloaded agent, then lets the SDK handle signature-based agent identification and blockchain writes for guard and audit operations.

## Exports

- `AtbashStateAnnotation`
- `createGuardNode()`
- `createAuditNode()`
- `addAtbashSafety()`
- `createJudgeTool()`

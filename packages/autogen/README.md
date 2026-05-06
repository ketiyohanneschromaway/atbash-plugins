# `@atbash/autogen`

AutoGen integration helpers for running an Atbash policy verdict before model/tool execution.

This package keeps the same flow as other Atbash integrations:

1. Send an action and context to Atbash with `judgeForAutoGen()`.
2. If verdict is `ALLOW`, continue to model/tool execution.
3. If verdict is `BLOCK` or `HOLD`, stop and surface the reason/tool call id.

## Exports

- `judgeForAutoGen()`
- `AutoGenJudgeInput`

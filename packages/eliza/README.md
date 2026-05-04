# `@atbash/eliza-plugin`

ElizaOS plugin that adds Atbash safety judgment, policy context, and audit logging.

## Highlights

- `atbashPlugin` registers the service, provider, evaluator, and explicit safety action
- `withAtbashGuard()` wraps custom Eliza actions behind an Atbash verdict gate
- Reads `ATBASH_AGENT_PRIVKEY` and optional `ATBASH_ENDPOINT` from the runtime settings
- Uses the SDK's local private-key signing flow so Eliza actions are attributed to the derived Atbash agent identity

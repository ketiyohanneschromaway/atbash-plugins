# Eliza Demo

The runnable demo at [guarded-action.mjs](/Users/ketiyohannes/Documents/development/work/Chromaway/atbash-plugins/examples/eliza-demo/guarded-action.mjs) shows the minimal runtime shape needed for `withAtbashGuard()`.

```bash
npm run build
ATBASH_AGENT_PRIVKEY=your_private_key node examples/eliza-demo/guarded-action.mjs
```

In a full ElizaOS agent, register `@atbash/eliza-plugin` and wrap sensitive custom actions with `withAtbashGuard()`.

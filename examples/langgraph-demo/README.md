# LangGraph Demo

The runnable demo graph is [app.mjs](/Users/ketiyohannes/Documents/development/work/Chromaway/atbash-plugins/examples/langgraph-demo/app.mjs).

```bash
npm run build
ATBASH_AGENT_PRIVKEY=your_private_key node examples/langgraph-demo/app.mjs
```

It builds a tiny graph, routes tool execution through `atbash_guard`, and compiles with a `MemorySaver` so `HOLD` can interrupt safely.

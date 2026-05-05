// Atbash security bridge for AutoGen demos.
// Run this process first, then run the Python test script.

import express from "express";
import { loadAgent } from "@atbash/sdk";
import { judgeForAutoGen } from "../../packages/autogen/dist/index.js";

const privKey = process.env.ATBASH_AGENT_PRIVKEY;

if (!privKey) {
  console.error("ATBASH_AGENT_PRIVKEY is not set.");
  console.error("Run: export ATBASH_AGENT_PRIVKEY=your_private_key_here");
  process.exit(1);
}

let agent;
try {
  agent = loadAgent(privKey);
  console.log("Agent loaded. Public key:", agent.pubkey);
} catch (error) {
  console.error("Failed to load agent:", error instanceof Error ? error.message : String(error));
  process.exit(1);
}

const app = express();
app.use(express.json());

app.post("/judge", async (req, res) => {
  const { action, context, toolName, toolArgs } = req.body ?? {};

  if (!action || !context) {
    return res.status(400).json({
      verdict: "ERROR",
      reason: "Both 'action' and 'context' fields are required.",
    });
  }

  console.log(`\n[Bridge] Judging tool: ${toolName ?? "unknown_tool"}`);
  console.log(`Action: ${action}`);

  try {
    const result = await judgeForAutoGen(
      { action, context, toolName, toolArgs },
      agent,
      process.env.ATBASH_ENDPOINT ? { endpoint: process.env.ATBASH_ENDPOINT } : {},
    );

    console.log(`Verdict: ${result.verdict}`);
    if (result.reason) {
      console.log(`Reason: ${result.reason}`);
    }

    return res.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Atbash SDK error:", message);
    return res.status(500).json({ verdict: "ERROR", reason: message });
  }
});

app.get("/health", (_req, res) => res.json({ status: "ok" }));

const port = Number(process.env.PORT ?? "3000");
app.listen(port, () => {
  console.log(`\nAtbash bridge running on http://localhost:${port}`);
  console.log(`Health check: http://localhost:${port}/health\n`);
});

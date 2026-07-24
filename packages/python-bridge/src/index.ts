import "dotenv/config";

import cors from "cors";
import express, { type Request, type Response } from "express";
import {
  judgeAction,
  loadAgent,
  type AgentAuth,
  type ClientOpts,
  type JudgeResult,
} from "@atbash/sdk";

type JudgeBody = {
  actionDesc?: unknown;
  context?: unknown;
};

function getClientOpts(): ClientOpts {
  const endpoint = process.env.ATBASH_ENDPOINT;
  return endpoint ? { endpoint } : {};
}

function main(): void {
  const privkey = process.env.ATBASH_AGENT_PRIVKEY;
  if (!privkey) {
    console.error("ATBASH_AGENT_PRIVKEY is required");
    process.exit(1);
  }

  const agent: AgentAuth = loadAgent(privkey);
  const clientOpts = getClientOpts();
  const port = Number(process.env.PORT) || 3000;

  const app = express();
  app.use(cors());
  app.use(express.json({ limit: "1mb" }));

  app.post("/judge", async (req: Request, res: Response) => {
    const body = req.body as JudgeBody;

    if (typeof body.actionDesc !== "string" || typeof body.context !== "string") {
      res.status(400).json({
        error: "Invalid body: expected JSON with string fields actionDesc and context",
      });
      return;
    }

    try {
      const result: JudgeResult = await judgeAction(
        body.actionDesc,
        body.context,
        agent,
        clientOpts,
      );

      res.json({
        verdict: result.verdict,
        reason: result.reason,
        tool_call_id: result.tool_call_id,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      res.status(502).json({
        error: message,
      });
    }
  });

  app.get("/health", (_req: Request, res: Response) => {
    res.json({ ok: true });
  });

  app.listen(port, () => {
    console.log(`@atbash/python-bridge listening on http://localhost:${port}`);
  });
}

main();

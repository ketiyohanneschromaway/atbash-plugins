import { createAtbashClient, loadAgent } from "@atbash/sdk";
import { judgeForAutoGen } from "@atbash/autogen";

function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

const atbashPrivkey = requireEnv("ATBASH_AGENT_PRIVKEY");
const atbashEndpoint = process.env.ATBASH_ENDPOINT;
const requestedAction =
  process.argv.slice(2).join(" ").trim() ||
  "Bank transfer $25 to a new external vendor account for urgent reimbursement";

const agent = loadAgent(atbashPrivkey);
const client = createAtbashClient({
  keyPair: agent,
  judge: atbashEndpoint ? { endpoint: atbashEndpoint } : undefined,
});

async function main() {
  console.log("Atbash agent pubkey:", agent.pubkey);
  console.log("Action text:", requestedAction);

  const result = await judgeForAutoGen(
    {
      action: requestedAction,
      context: "AutoGen agent checking transfer before execution",
      toolName: "send_bank_transfer",
      toolArgs: {
        request: requestedAction,
      },
    },
    client,
  );

  console.log("\n[AutoGen Judge Result]");
  console.dir(result, { depth: null });
}

main().catch((error) => {
  console.error("\n[Example Error]");
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});

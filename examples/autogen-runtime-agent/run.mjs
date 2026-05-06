import { loadAgent } from "@atbash/sdk";
import { judgeForAutoGen } from "@atbash/autogen";

const DEFAULT_ATBASH_AGENT_PRIVKEY =
  "f7fb37278c1283cc925d97ca4fffba7b02aeb2eb4817ec406c520599d683d76a";

const atbashPrivkey = process.env.ATBASH_AGENT_PRIVKEY ?? DEFAULT_ATBASH_AGENT_PRIVKEY;
const atbashEndpoint = process.env.ATBASH_ENDPOINT;
const requestedAction =
  process.argv.slice(2).join(" ").trim() ||
  "Bank transfer $25 to a new external vendor account for urgent reimbursement";

const agent = loadAgent(atbashPrivkey);

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
    agent,
    atbashEndpoint ? { endpoint: atbashEndpoint } : {},
  );

  console.log("\n[AutoGen Judge Result]");
  console.dir(result, { depth: null });
}

main().catch((error) => {
  console.error("\n[Example Error]");
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});

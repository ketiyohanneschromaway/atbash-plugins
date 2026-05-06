import { loadAgent } from "@atbash/sdk";
import { DynamicStructuredTool } from "@langchain/core/tools";
import { z } from "zod";
import { withAtbashGuard } from "@atbash/langchain";

const DEFAULT_ATBASH_AGENT_PRIVKEY =
  "f7fb37278c1283cc925d97ca4fffba7b02aeb2eb4817ec406c520599d683d76a";

const atbashPrivkey = process.env.ATBASH_AGENT_PRIVKEY ?? DEFAULT_ATBASH_AGENT_PRIVKEY;
const atbashEndpoint = process.env.ATBASH_ENDPOINT;
const requestedAction =
  process.argv.slice(2).join(" ").trim() ||
  "Bank transfer $25 to a new external vendor account for urgent reimbursement";

const agent = loadAgent(atbashPrivkey);

const transferTool = new DynamicStructuredTool({
  name: "send_bank_transfer",
  description: "Send a bank transfer to an external vendor account",
  schema: z.object({
    request: z.string(),
  }),
  func: async (input) => {
    return `Simulated LangChain transfer executed: ${input.request}`;
  },
});

const guardedTool = withAtbashGuard(transferTool, agent, atbashEndpoint ? { endpoint: atbashEndpoint } : {});

async function main() {
  console.log("Atbash agent pubkey:", agent.pubkey);
  console.log("Action text:", requestedAction);

  try {
    const result = await guardedTool.invoke({
      request: requestedAction,
    });

    console.log("\n[Tool Result]");
    console.dir(result, { depth: null });
  } catch (error) {
    console.log("\n[Guard Result]");
    console.log(error instanceof Error ? error.message : String(error));
  }
}

main().catch((error) => {
  console.error("\n[Example Error]");
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});

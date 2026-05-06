import { AgentRuntime } from "@elizaos/core";
import { loadAgent } from "@atbash/sdk";
import atbashPlugin, { withAtbashGuard } from "@atbash/eliza-plugin";
import { createInMemoryAdapter } from "./adapter.mjs";

const DEFAULT_ATBASH_AGENT_PRIVKEY =
  "f7fb37278c1283cc925d97ca4fffba7b02aeb2eb4817ec406c520599d683d76a";

const atbashPrivkey = process.env.ATBASH_AGENT_PRIVKEY ?? DEFAULT_ATBASH_AGENT_PRIVKEY;
const atbashEndpoint = process.env.ATBASH_ENDPOINT;
const requestedAction =
  process.argv.slice(2).join(" ").trim() ||
  "Transfer $25 to a new external wallet 0xabc for urgent vendor reimbursement";

const atbashAgent = loadAgent(atbashPrivkey);

const sendFundsAction = {
  name: "SEND_FUNDS",
  similes: ["TRANSFER_FUNDS", "PAYOUT_FUNDS"],
  description: "Send treasury funds to an external destination",
  validate: async () => true,
  handler: withAtbashGuard(async (_runtime, message, _state, _options, callback) => {
    const text = message.content?.text ?? "No action text provided";
    callback?.({
      text: `Transfer executed by Eliza runtime.\nAction: ${text}`,
    });
    return {
      success: true,
      text: `Transfer executed: ${text}`,
      data: {
        simulated: true,
      },
    };
  }),
  examples: [
    [
      {
        user: "{{user}}",
        content: {
          text: "Transfer $25 to a new external wallet 0xabc for urgent vendor reimbursement",
        },
      },
      {
        user: "{{agent}}",
        content: {
          text: "I will submit this transfer through the guarded SEND_FUNDS action.",
          action: "SEND_FUNDS",
        },
      },
    ],
  ],
};

const treasuryDemoPlugin = {
  name: "treasury-demo-plugin",
  description: "Registers one guarded treasury action",
  actions: [sendFundsAction],
};

const runtime = new AgentRuntime({
  adapter: createInMemoryAdapter(),
  plugins: [atbashPlugin, treasuryDemoPlugin],
  character: {
    name: "Atbash Treasury Agent",
    bio: ["Treasury operations agent protected by Atbash"],
    system:
      "You are a treasury operations agent. All sensitive actions must pass through Atbash before execution.",
    settings: atbashEndpoint
      ? {
          ATBASH_ENDPOINT: atbashEndpoint,
        }
      : {},
    secrets: {
      ATBASH_AGENT_PRIVKEY: atbashPrivkey,
    },
  },
});

const callback = async (content) => {
  if (content?.text) {
    console.log("\n[Callback]");
    console.log(content.text);
  }
  return [];
};

async function main() {
  console.log("Atbash agent pubkey:", atbashAgent.pubkey);
  console.log("Action text:", requestedAction);

  await runtime.initialize({ skipMigrations: true });
  await runtime.getServiceLoadPromise("atbash");

  const provider = runtime.providers.find((entry) => entry.name === "atbash-policy");
  if (provider) {
    const providerResult = await provider.get(
      runtime,
      { content: { text: "Show current Atbash safety status" } },
      { values: {}, data: {}, text: "" },
    );

    if (providerResult?.text) {
      console.log("\n[Policy Provider]");
      console.log(providerResult.text);
    }
  }

  const atbashJudge = runtime.actions.find((entry) => entry.name === "ATBASH_JUDGE");
  if (!atbashJudge?.handler) {
    throw new Error("ATBASH_JUDGE action not registered");
  }

  const sendFunds = runtime.actions.find((entry) => entry.name === "SEND_FUNDS");
  if (!sendFunds?.handler) {
    throw new Error("SEND_FUNDS action not registered");
  }

  const message = {
    content: {
      text: requestedAction,
    },
  };

  const judgeResult = await atbashJudge.handler(
    runtime,
    message,
    undefined,
    undefined,
    callback,
  );
  console.log("\n[ATBASH_JUDGE Result]");
  console.dir(judgeResult, { depth: null });

  const sendFundsResult = await sendFunds.handler(
    runtime,
    message,
    undefined,
    undefined,
    callback,
  );
  console.log("\n[SEND_FUNDS Result]");
  console.dir(sendFundsResult, { depth: null });
}

main()
  .catch((error) => {
    console.error("\n[Example Error]");
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await runtime.stop().catch(() => {});
  });

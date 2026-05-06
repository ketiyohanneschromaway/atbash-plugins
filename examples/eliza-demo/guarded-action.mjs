import { loadAgent } from "@atbash/sdk";
import { withAtbashGuard } from "../../packages/eliza/dist/index.js";

if (!process.env.ATBASH_AGENT_PRIVKEY) {
  console.error("Set ATBASH_AGENT_PRIVKEY before running the Eliza demo.");
  process.exit(1);
}

const agent = loadAgent(process.env.ATBASH_AGENT_PRIVKEY);

const runtime = {
  getService(name) {
    if (name !== "atbash") {
      throw new Error(`Unknown service: ${name}`);
    }

    return {
      getAgent: () => agent,
      getClientOpts: () =>
        process.env.ATBASH_ENDPOINT ? { endpoint: process.env.ATBASH_ENDPOINT } : {},
    };
  },
};

const guardedTransfer = withAtbashGuard(async () => {
  return {
    success: true,
    text: "Transfer executed after Atbash returned ALLOW.",
  };
});

const callback = async (content) => {
  console.log("Callback:");
  console.log(content.text);
  return [];
};

const result = await guardedTransfer(
  runtime,
  { content: { text: "Transfer $2,500 to new external wallet 0xabc for vendor payment" } },
  undefined,
  undefined,
  callback,
);

console.log("Handler result:");
console.log(result);

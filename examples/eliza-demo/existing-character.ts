import atbashPlugin from "../../packages/eliza/dist/index.js";
import { sendFundsAction } from "./sendFundsAction.js";

export const character = {
  name: "TreasuryBot",
  bio: ["Treasury operations agent"],
  system: "You are a treasury operations agent that must respect Atbash safety checks.",
  plugins: [atbashPlugin],
  settings: {
    ATBASH_ENDPOINT: process.env.ATBASH_ENDPOINT,
  },
  secrets: {
    ATBASH_AGENT_PRIVKEY: process.env.ATBASH_AGENT_PRIVKEY,
  },
  actions: [sendFundsAction],
};

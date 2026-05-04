import { atbashJudgeAction, withAtbashGuard } from "./actions/judgeAction.js";
import { auditEvaluator } from "./evaluators/auditEvaluator.js";
import { policyProvider } from "./providers/policyProvider.js";
import { AtbashService } from "./services/atbashService.js";

type AtbashPlugin = {
  name: string;
  description: string;
  services: unknown[];
  actions: unknown[];
  providers: unknown[];
  evaluators: unknown[];
  config: Record<string, { required: boolean; description: string }>;
};

export const atbashPlugin: AtbashPlugin = {
  name: "@atbash/eliza-plugin",
  description: "Atbash safety layer for ElizaOS agents",
  services: [AtbashService],
  actions: [atbashJudgeAction],
  providers: [policyProvider],
  evaluators: [auditEvaluator],
  config: {
    ATBASH_AGENT_PRIVKEY: {
      required: true,
      description: "Agent private key (64-hex)",
    },
    ATBASH_ENDPOINT: {
      required: false,
      description: "Optional Atbash API endpoint override",
    },
  },
};

export default atbashPlugin;
export { withAtbashGuard, AtbashService };

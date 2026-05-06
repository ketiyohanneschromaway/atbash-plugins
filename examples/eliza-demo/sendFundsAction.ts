import { withAtbashGuard } from "../../packages/eliza/dist/index.js";

async function sendFundsSomehow() {
  return { transferId: "demo-transfer-123" };
}

export const sendFundsAction = {
  name: "SEND_FUNDS",
  description: "Send funds to an external destination",
  similes: ["TRANSFER_FUNDS", "WIRE_FUNDS"],
  validate: async () => true,
  handler: withAtbashGuard(async () => {
    const result = await sendFundsSomehow();
    return {
      success: true,
      text: `Transfer submitted: ${result.transferId}`,
      data: result,
    };
  }),
};

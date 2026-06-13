export const SUBMISSION_PROJECT = {
  name: "AI2Human",
  tagline: "Human fallback infrastructure for AI agents",
  oneLiner:
    "AI2Human inserts a planner precheck before fallback: the system queries wallet, market, and trade routes, keeps work autonomous when possible, and dispatches a human operator only when identity, compliance, growth execution, or real-world constraints still block the task.",
  githubUrl: "https://github.com/ai2humanagent/ai2humanwork",
  demoPath: "/livedemo",
  reviewerPath: "/reviewer",
  tasksPath: "/tasks",
  submissionPath: "/submission"
};

export const SUBMISSION_SPRINT = {
  name: "Base-first rollout",
  track: "Base agent commerce"
};

export const SUBMISSION_PRIMARY_RAIL = {
  label: "Base",
  network: "base-mainnet",
  tokenSymbol: "USDC",
  status: "default product rail"
};

export const SUBMISSION_CORE_LOOP = [
  "Task posted with proof requirements",
  "Planner queries wallet, market, and trade routes",
  "If the task is still blocked, the planner escalates to dispatcher-led human fallback",
  "Human operator claims and executes the last-resort real-world step",
  "Structured proof is submitted and verified",
  "Settlement is released on Base"
];

export const SUBMISSION_ONCHAIN_OS_PRECHECK = [
  {
    label: "Wallet API",
    description:
      "Checks signer control, payout readiness, and whether the agent can keep execution inside a connected wallet."
  },
  {
    label: "Market API",
    description:
      "Checks whether a quoted onchain route can satisfy the request before escalating out of software."
  },
  {
    label: "Trade API",
    description: "Checks whether settlement and asset movement can stay autonomous on the configured onchain rail."
  }
];

export const SUBMISSION_CHAIN_NATIVE_FRAMING =
  "Human fallback is the last-resort execution layer when onchain agents hit real-world constraints or compliance gates.";

export const SUBMISSION_BASE_ROLLOUT = {
  label: "Base-first product path",
  network: "base-mainnet",
  chainId: 8453,
  tokenSymbol: "USDC",
  explorerUrl: "https://basescan.org",
  walletRail: "Privy defaults to Base",
  launchRail: "Bankr token launch flow points to Base",
  settlementRail: "Reviewer, live demo, and task settlement now default to Base",
  proofStatus: "A live Base USDC settlement receipt is now recorded; archived BNB and X Layer receipts remain below."
};

export const SUBMISSION_BASE_SETTLEMENT = {
  label: "Live Base settlement proof",
  payerAddress: "0x3f665386b41Fa15c5ccCeE983050a236E6a10108",
  operatorAddress: "0x81009cc711e5e0285dd8f703aab1af69fa4a4390",
  amount: "0.01",
  tokenSymbol: "USDC",
  tokenAddress: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
  network: "base-mainnet",
  chainId: 8453,
  fundingTxHash: "0x3fe5b99b2af4934c3b30d3087a703157e4f7cfcb8fc5dc58cecb48e249788f5e",
  fundingExplorerUrl:
    "https://basescan.org/tx/0x3fe5b99b2af4934c3b30d3087a703157e4f7cfcb8fc5dc58cecb48e249788f5e",
  txHash: "0xee543bc107b411edd0202131b82172eb6efaf29c10457e33d2900ae890a72cf0",
  explorerUrl:
    "https://basescan.org/tx/0xee543bc107b411edd0202131b82172eb6efaf29c10457e33d2900ae890a72cf0"
};

export const SUBMISSION_REAL_SETTLEMENT = {
  taskId: "7bde6365-9e4a-4fa9-a2f4-e79657b354b3",
  taskPath: "/tasks/7bde6365-9e4a-4fa9-a2f4-e79657b354b3",
  taskTitle: "Reply to the official thread with a localized summary and CTA",
  proofPostUrl: "https://x.com/Richard_buildai/status/2036393335326380458",
  payerAddress: "0x3f665386b41Fa15c5ccCeE983050a236E6a10108",
  operatorAddress: "0x81009cc711e5e0285dd8f703aab1af69fa4a4390",
  amount: "0.01",
  tokenSymbol: "USDT0",
  tokenDisplayName: "USD₮0",
  network: "xlayer-mainnet",
  chainId: 196,
  txHash: "0x9c01ad8dac5f2fa1d77da8e9b3f2a3afbfe539ea68af7f3929d7bf9a5f3f5d67",
  explorerUrl:
    "https://www.oklink.com/xlayer/tx/0x9c01ad8dac5f2fa1d77da8e9b3f2a3afbfe539ea68af7f3929d7bf9a5f3f5d67",
  settledAt: "2026-03-24T10:57:41.334Z"
};

export const SUBMISSION_BNB_SETTLEMENT = {
  label: "Archived BNB Chain settlement proof",
  payerAddress: "0x3f665386b41Fa15c5ccCeE983050a236E6a10108",
  operatorAddress: "0x81009cc711e5e0285dd8f703aab1af69fa4a4390",
  amount: "0.01",
  tokenSymbol: "USDT",
  tokenAddress: "0x55d398326f99059fF775485246999027B3197955",
  network: "bnb-mainnet",
  chainId: 56,
  swapTxHash: "0xd9e53df924f464a0b40593341a6116158b08118bf2b292176caab6aba3dd1080",
  swapExplorerUrl:
    "https://bscscan.com/tx/0xd9e53df924f464a0b40593341a6116158b08118bf2b292176caab6aba3dd1080",
  txHash: "0x9739bff25473e14db16409124648f99536d863e82a4ffcde50356289b09b80a2",
  explorerUrl:
    "https://bscscan.com/tx/0x9739bff25473e14db16409124648f99536d863e82a4ffcde50356289b09b80a2",
  settledAt: "2026-04-20T11:15:15.000Z"
};

export const SUBMISSION_X402_STATUS = {
  integrated: true,
  provenOnchain: false,
  summary:
    "The x402 verification bundle remains archived as an earlier X Layer add-on. It is no longer part of the primary Base product path."
};

export const SUBMISSION_PROJECT = {
  name: "ai2human",
  tagline: "Human fallback infrastructure for AI agents",
  oneLiner:
    "ai2human inserts a planner precheck before fallback: the system queries wallet, market, and trade routes, keeps work autonomous when possible, and dispatches a human operator only when identity, compliance, growth execution, or real-world constraints still block the task.",
  githubUrl: "https://github.com/richard7463/ai2humanwork",
  demoPath: "/livedemo",
  reviewerPath: "/reviewer",
  tasksPath: "/tasks",
  submissionPath: "/submission"
};

export const SUBMISSION_SPRINT = {
  name: "Four.meme AI Sprint",
  track: "AI x Web3 / growth ops"
};

export const SUBMISSION_PRIMARY_RAIL = {
  label: "BNB Chain",
  network: "bnb-mainnet",
  tokenSymbol: "USDT",
  status: "configured for live settlement demo"
};

export const SUBMISSION_CORE_LOOP = [
  "Task posted with proof requirements",
  "Planner queries wallet, market, and trade routes",
  "If the task is still blocked, the planner escalates to dispatcher-led human fallback",
  "Human operator claims and executes the last-resort real-world step",
  "Structured proof is submitted and verified",
  "Settlement is released on BNB Chain"
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

export const SUBMISSION_X402_STATUS = {
  integrated: true,
  provenOnchain: false,
  summary:
    "An x402-gated verification bundle flow is integrated as a bonus proof-access layer. It is not the primary scoring claim for this sprint."
};

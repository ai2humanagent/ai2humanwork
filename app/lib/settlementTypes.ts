export type SettlementRail = "base" | "bnb" | "xlayer" | "solana";

export type SettlementMethod =
  | "mock_x402"
  | "base_erc20"
  | "bnb_erc20"
  | "xlayer_erc20"
  | "solana_native"
  | "x402_exact"
  | "prize_pool_claim";

export type SettlementNetwork =
  | "base-mainnet"
  | "base-sepolia"
  | "base-custom"
  | "bnb-mainnet"
  | "bnb-testnet"
  | "bnb-custom"
  | "xlayer-mainnet"
  | "xlayer-testnet"
  | "xlayer-custom"
  | "solana-mainnet"
  | "solana-devnet"
  | "solana-custom";

export type SettlementReceipt = {
  amount: string;
  receiverAddress?: string;
  payerAddress?: string;
  method: SettlementMethod;
  status: "paid";
  network?: SettlementNetwork;
  chainId?: number;
  tokenSymbol?: string;
  tokenAddress?: string;
  txHash?: string;
  explorerUrl?: string;
  evidenceLabel: string;
  configurationHint?: string;
};

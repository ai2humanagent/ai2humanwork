export type SettlementRail = "bnb" | "xlayer" | "solana";

export type SettlementMethod =
  | "mock_x402"
  | "bnb_erc20"
  | "xlayer_erc20"
  | "solana_native"
  | "x402_exact";

export type SettlementNetwork =
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

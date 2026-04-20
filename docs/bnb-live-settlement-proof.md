# BNB Chain Live Settlement Proof

This document records the fresh BNB Chain mainnet proof for the Four.meme AI Sprint branch.

## Summary

- Project: `ai2human`
- Branch: `dev_bnb`
- Purpose: prove the current BNB settlement rail can execute real ERC20 payouts, not only mock settlement.
- Chain: BNB Chain mainnet
- Chain ID: `56`
- Settlement asset: `USDT`
- USDT token: `0x55d398326f99059fF775485246999027B3197955`
- Payer wallet: `0x3f665386b41Fa15c5ccCeE983050a236E6a10108`
- Operator payout wallet: `0x81009cc711e5e0285dd8f703aab1af69fa4a4390`
- Private key: not recorded in this repo or document.

## Funding Swap

Small amount of BNB was swapped into USDT to fund the settlement rail.

- Method: PancakeSwap V2 `swapExactETHForTokens`
- Router: `0x10ED43C718714eb63d5aA57B78B54704E256024E`
- Input: `0.002 BNB`
- Output transfer decoded from USDT event: `1.247570781080110841 USDT`
- Tx hash: `0xd9e53df924f464a0b40593341a6116158b08118bf2b292176caab6aba3dd1080`
- Explorer: `https://bscscan.com/tx/0xd9e53df924f464a0b40593341a6116158b08118bf2b292176caab6aba3dd1080`
- Block: `93627073`
- Timestamp: `2026-04-20T11:14:27.000Z` / `2026-04-20 19:14:27 UTC+8`
- Status: `success`

## Settlement Transfer

This is the real payout proof for the current BNB rail.

- Method: ERC20 `transfer(address,uint256)`
- Amount: `0.01 USDT`
- From: `0x3f665386b41Fa15c5ccCeE983050a236E6a10108`
- To: `0x81009cC711E5E0285DD8f703aAb1AF69fA4a4390`
- Token contract: `0x55d398326f99059fF775485246999027B3197955`
- Tx hash: `0x9739bff25473e14db16409124648f99536d863e82a4ffcde50356289b09b80a2`
- Explorer: `https://bscscan.com/tx/0x9739bff25473e14db16409124648f99536d863e82a4ffcde50356289b09b80a2`
- Block: `93627181`
- Timestamp: `2026-04-20T11:15:15.000Z` / `2026-04-20 19:15:15 UTC+8`
- Gas used: `51579`
- Status: `success`

## Product Surfaces Updated

- `/submission` now shows `Live BNB Rail Proof` with the BscScan settlement link.
- `README.md` now includes the fresh BNB settlement and funding swap links.
- `docs/fourmeme-submission.md` now includes the live BNB proof under Proof Assets.
- Settlement scripts now default BNB rail to BSC USDT and can reuse the shared EVM key fallback.

## Verification Commands

```bash
npm run test
npm run build
node scripts/settlement-preflight.mjs --rail=bnb 0.01 0x81009cc711e5e0285dd8f703aab1af69fa4a4390
```

The real broadcast command used the batch transfer script with explicit confirmation:

```bash
node scripts/settlement-batch-transfer.mjs --rail=bnb 0.01 0x81009cc711e5e0285dd8f703aab1af69fa4a4390 --broadcast --confirm=SEND
```


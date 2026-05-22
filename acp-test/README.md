# ACP buyer test (Node.js)

This folder contains minimal buyer and seller scripts for ACP testing.

## 1) Install deps

```bash
npm install @virtuals-protocol/acp-node dotenv
```

## 2) Set env

Copy `.env.example` to `.env` and fill in values.

## 3) Run (Seller)

```bash
node seller.mjs
```

Keep this running to keep your agent online.

## 4) Run (Buyer)

```bash
node buyer.mjs
```

## Notes

- If you want to match the seller precisely, set `SELLER_ENTITY_ID` or `SELLER_AGENT_WALLET_ADDRESS`.
- If your job schema differs, set `REQUIREMENT_JSON` to your exact schema.
- Use `SERVICE_NAMES` to control which jobs the seller accepts.

import 'dotenv/config';
import dns from 'node:dns';
import acpPkg from '@virtuals-protocol/acp-node';

const { default: AcpClient, AcpContractClient, baseAcpConfig, baseSepoliaAcpConfig } = acpPkg;

// Force DNS servers in this environment to avoid ENOTFOUND errors.
dns.setServers(['1.1.1.1', '8.8.8.8']);

function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

function safeJsonParse(value, label) {
  try {
    return JSON.parse(value);
  } catch (err) {
    throw new Error(`Invalid JSON in ${label}: ${err.message}`);
  }
}

async function main() {
  const privateKey = requireEnv('WHITELISTED_WALLET_PRIVATE_KEY');
  const buyerEntityId = requireEnv('BUYER_ENTITY_ID');
  const buyerWallet = requireEnv('BUYER_AGENT_WALLET_ADDRESS');

  const sellerEntityId = process.env.SELLER_ENTITY_ID || '';
  const sellerWallet = process.env.SELLER_AGENT_WALLET_ADDRESS || '';
  const sellerKeyword = process.env.SELLER_SEARCH_KEYWORD || 'MiraixAI';
  const cluster = process.env.ACP_CLUSTER || '';
  const directServiceName = process.env.SERVICE_NAME || process.env.SELLER_JOB_NAME || 'swap token';
  const directPriceUsd = process.env.PRICE_USD ? Number(process.env.PRICE_USD) : 0.1;

  const network = (process.env.ACP_NETWORK || 'base').toLowerCase();
  const config = network === 'base-sepolia' ? baseSepoliaAcpConfig : baseAcpConfig;

  const acpContractClient = await AcpContractClient.build(
    privateKey,
    buyerEntityId,
    buyerWallet,
    process.env.CUSTOM_RPC_URL || undefined,
    config
  );

  const acpClient = new AcpClient({
    acpContractClient,
    // If you pass evaluator + onEvaluate, you can require explicit evaluation.
    // Leaving it out lets the job auto-approve.
  });

  await acpClient.init();

  const derivedWallet = acpContractClient.walletAddress;
  if (derivedWallet && buyerWallet && derivedWallet.toLowerCase() !== buyerWallet.toLowerCase()) {
    console.warn('Buyer wallet mismatch:');
    console.warn('  Derived wallet from private key + entity:', derivedWallet);
    console.warn('  BUYER_AGENT_WALLET_ADDRESS:', buyerWallet);
  }

  const browseOptions = cluster ? { cluster } : {};
  let relevantAgents = [];
  try {
    relevantAgents = await acpClient.browseAgents(sellerKeyword, browseOptions);
  } catch (err) {
    console.warn('browseAgents failed, will try direct mode if seller wallet provided:', err?.message || err);
  }

  const canBrowse = relevantAgents && relevantAgents.length > 0;

  if (process.env.DEBUG_AGENTS === '1' && canBrowse) {
    console.log(
      'Found agents:',
      relevantAgents.map((agent) => ({
        name: agent.name,
        walletAddress: agent.walletAddress,
        offerings: (agent.offerings || []).map((offering) => offering.name),
      }))
    );
  }

  if (!canBrowse) {
    if (!sellerWallet) {
      console.error('No agents found and SELLER_AGENT_WALLET_ADDRESS is not set.');
      process.exit(1);
    }
  }

  const chosenAgent = canBrowse
    ? relevantAgents.find((agent) => {
        const entityId = agent.entityId || agent.entity_id;
        const walletAddress = agent.walletAddress || agent.agentWalletAddress || agent.address;
        return (sellerEntityId && entityId === sellerEntityId) || (sellerWallet && walletAddress === sellerWallet);
      }) || relevantAgents[0]
    : null;

  const offerings = chosenAgent ? chosenAgent.jobOfferings || chosenAgent.offerings || [] : [];

  const preferredJobName = process.env.SELLER_JOB_NAME || '';
  const chosenJobOffering =
    offerings.length > 0
      ? (preferredJobName
          ? offerings.find((offering) => offering.name === preferredJobName)
          : null) || offerings[0]
      : null;

  if (chosenJobOffering && preferredJobName && chosenJobOffering.name !== preferredJobName) {
    console.warn(`Preferred job "${preferredJobName}" not found. Using "${chosenJobOffering.name}".`);
  }

  if (chosenJobOffering && chosenJobOffering.requirementSchema && typeof chosenJobOffering.requirementSchema !== 'object') {
    try {
      const parsed = JSON.parse(chosenJobOffering.requirementSchema);
      chosenJobOffering.requirementSchema = parsed;
    } catch {
      console.warn('Requirement schema is not a valid JSON object; skipping client-side validation.');
      chosenJobOffering.requirementSchema = null;
    }
  }

  const requirement = process.env.REQUIREMENT_JSON
    ? safeJsonParse(process.env.REQUIREMENT_JSON, 'REQUIREMENT_JSON')
    : {
        fromToken: process.env.FROM_TOKEN || 'SOL',
        toToken: process.env.TO_TOKEN || 'USDC',
        amount: process.env.AMOUNT ? Number(process.env.AMOUNT) : 1,
        walletAddress: process.env.SWAP_WALLET_ADDRESS || buyerWallet,
        slippageBps: process.env.SLIPPAGE_BPS ? Number(process.env.SLIPPAGE_BPS) : 50,
        simulate: true,
      };

  const expiredAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

  let jobId;
  if (chosenJobOffering && chosenJobOffering.providerAddress) {
    jobId = await chosenJobOffering.initiateJob(
      requirement,
      undefined,
      expiredAt
    );
    console.log('Initiated job via offering:', jobId);
  } else {
    if (!sellerWallet) {
      console.error('No valid offering/providerAddress found, and SELLER_AGENT_WALLET_ADDRESS is not set.');
      process.exit(1);
    }
    const servicePayload =
      typeof requirement === 'string'
        ? { serviceName: directServiceName, message: requirement }
        : { serviceName: directServiceName, serviceRequirement: requirement };
    jobId = await acpClient.initiateJob(
      sellerWallet,
      servicePayload,
      directPriceUsd,
      undefined,
      expiredAt
    );
    console.log('Initiated job via direct call:', jobId);
  }

  console.log('Requirement:', requirement);
  // Close out cleanly so the process doesn't hang on open sockets.
  setTimeout(() => process.exit(0), 250);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

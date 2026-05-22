import 'dotenv/config';
import acpPkg from '@virtuals-protocol/acp-node';
import crypto from 'node:crypto';

const { default: AcpClient, AcpContractClient, baseAcpConfig, baseSepoliaAcpConfig } = acpPkg;

function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

function parseServiceNames(value) {
  if (!value) {
    return [];
  }
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function safeLower(value) {
  return typeof value === 'string' ? value.toLowerCase() : '';
}

function randomTxHash() {
  return `0x${crypto.randomBytes(32).toString('hex')}`;
}

async function main() {
  const privateKey = process.env.PROVIDER_PRIVATE_KEY || requireEnv('WHITELISTED_WALLET_PRIVATE_KEY');
  const providerEntityId = requireEnv('PROVIDER_ENTITY_ID');
  const providerWallet = requireEnv('PROVIDER_AGENT_WALLET_ADDRESS');

  const network = (process.env.ACP_NETWORK || 'base').toLowerCase();
  const config = network === 'base-sepolia' ? baseSepoliaAcpConfig : baseAcpConfig;

  const allowedServiceNames = parseServiceNames(
    process.env.SERVICE_NAMES || process.env.SERVICE_NAME || 'swap token,swap_token'
  ).map((name) => name.toLowerCase());

  const acpContractClient = await AcpContractClient.build(
    privateKey,
    providerEntityId,
    providerWallet,
    process.env.CUSTOM_RPC_URL || undefined,
    config
  );

  const handled = new Set();

  new AcpClient({
    acpContractClient,
    onNewTask: async (job, memoToSign) => {
      const memoPhase = memoToSign?.nextPhase ?? job?.latestMemo?.nextPhase;
      const jobKey = `${job.id}:${memoPhase}`;
      if (handled.has(jobKey)) {
        return;
      }
      handled.add(jobKey);

      const serviceName = safeLower(job?.serviceName);
      const requirement = job?.serviceRequirement;
      const requirementIsObject = requirement && typeof requirement === 'object';

      if (memoPhase === 1) {
        if (allowedServiceNames.length > 0 && serviceName && !allowedServiceNames.includes(serviceName)) {
          await job.respond(false, undefined, `Unsupported service: ${job.serviceName}`);
          console.log('Rejected job', job.id, 'service:', job.serviceName);
          return;
        }

        if (requirementIsObject) {
          const hasLegacy = requirement.walletAddress && requirement.message;
          const hasNew =
            requirement.fromToken &&
            requirement.toToken &&
            requirement.amount !== undefined &&
            requirement.amount !== null &&
            requirement.amount !== '';
          if (!hasLegacy && !hasNew) {
            await job.respond(false, undefined, 'Missing required fields: fromToken/toToken/amount or walletAddress/message');
            console.log('Rejected job', job.id, 'missing fields');
            return;
          }
        }

        await job.respond(true, { status: 'accepted' }, 'Accepted by provider');
        console.log('Accepted job', job.id, 'service:', job.serviceName);
        return;
      }

      if (memoPhase === 3) {
        const fromToken = requirementIsObject ? requirement.fromToken : undefined;
        const toToken = requirementIsObject ? requirement.toToken : undefined;
        const amount = requirementIsObject ? requirement.amount : undefined;
        const deliverable = {
          txHash: process.env.SIMULATED_TX_HASH || randomTxHash(),
          fromToken: fromToken || process.env.SIMULATED_FROM_TOKEN || 'SOL',
          toToken: toToken || process.env.SIMULATED_TOKEN_OUT || 'USDC',
          amountIn: amount ?? process.env.SIMULATED_AMOUNT_IN ?? '0',
          amountOut: process.env.SIMULATED_AMOUNT_OUT || '0',
          status: process.env.SIMULATED_STATUS || 'simulated',
          simulation: true
        };

        await job.deliver(deliverable);
        console.log('Delivered job', job.id, deliverable);
        return;
      }

      console.log('Ignoring job', job.id, 'phase', memoPhase);
    }
  });

  console.log('Seller online. Waiting for jobs...');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

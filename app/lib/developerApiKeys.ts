import crypto from "crypto";
import { hashAgentApiKey, verifyAgentApiKey } from "./agentRegistry";
import type { DeveloperApiKeyRecord, UserAccount } from "./store";

export const DEVELOPER_API_KEY_PREFIX = "a2h_live_";

export function createDeveloperApiKey(id: string, keyName: string, ownerUserId: string, scopes: string[]) {
  const secret = crypto.randomBytes(32).toString("base64url");
  const apiKey = `${DEVELOPER_API_KEY_PREFIX}${ownerUserId}_${id}_${secret}`;
  const keyPrefix = apiKey.slice(0, Math.min(apiKey.length, 28));
  const record: DeveloperApiKeyRecord = {
    id,
    name: keyName,
    keyPrefix,
    apiKeyHash: hashAgentApiKey(apiKey),
    scopes,
    state: "active",
    requests: 0,
    createdAt: new Date().toISOString()
  };
  return { apiKey, record };
}

export function readDeveloperApiKeyIdentity(apiKey: string) {
  const match = apiKey.match(/^a2h_live_([0-9a-f-]{36})_(devkey_[a-z0-9]+)_/i);
  return match ? { ownerUserId: match[1], keyId: match[2] } : null;
}

export function verifyIssuedDeveloperApiKey(apiKey: string, users: UserAccount[]) {
  const identity = readDeveloperApiKeyIdentity(apiKey);
  if (!identity) return false;
  const owner = users.find((user) => user.id === identity.ownerUserId);
  const record = owner?.developerApiKeys?.find((item) => item.id === identity.keyId);
  return Boolean(
    record &&
    record.state === "active" &&
    !record.revokedAt &&
    verifyAgentApiKey(apiKey, record.apiKeyHash)
  );
}

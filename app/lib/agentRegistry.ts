import crypto from "crypto";

export type AIAgent = {
  id: string;
  name: string;
  handle: string;
  description: string;
  apiKeyHash: string;
  walletAddress?: string;
  skills: string[];
  rating: number;
  tasksPublished: number;
  totalPaid: string;
  verified: boolean;
  createdAt: string;
};

export function generateAgentApiKey(): string {
  return crypto.randomBytes(32).toString("hex");
}

export function hashAgentApiKey(key: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const digest = crypto.scryptSync(key, salt, 64).toString("hex");
  return `${salt}:${digest}`;
}

export function verifyAgentApiKey(key: string, stored: string): boolean {
  const [salt, digest] = stored.split(":");
  if (!salt || !digest) return false;
  const candidate = crypto.scryptSync(key, salt, 64);
  const target = Buffer.from(digest, "hex");
  if (candidate.length !== target.length) return false;
  return crypto.timingSafeEqual(candidate, target);
}

export const seedAgents: AIAgent[] = [
  {
    id: "agent_official",
    name: "AI2Human Official",
    handle: "@ai2humannetwork",
    description: "Official AI2Human campaign agent. Publishes X growth tasks and real-world verification quests.",
    apiKeyHash: "",
    walletAddress: "0x3f665386b41Fa15c5ccCeE983050a236E6a10108",
    skills: ["x_campaigns", "real_world", "verification"],
    rating: 100,
    tasksPublished: 0,
    totalPaid: "0 USDC",
    verified: true,
    createdAt: "2025-01-01T00:00:00.000Z"
  }
];

import { promises as fs } from "fs";
import path from "path";

export type TaskStatus =
  | "created"
  | "ai_running"
  | "ai_failed"
  | "ai_done"
  | "human_assigned"
  | "human_done"
  | "verified"
  | "paid";

export type EvidenceItem = {
  id: string;
  by: "ai" | "human" | "system";
  type: "log" | "note" | "photo";
  content: string;
  createdAt: string;
};

export type Task = {
  id: string;
  title: string;
  budget: string;
  deadline: string;
  acceptance: string;
  status: TaskStatus;
  createdAt: string;
  updatedAt: string;
  assignee?: {
    type: "ai" | "human";
    name: string;
  };
  evidence: EvidenceItem[];
};

type Db = {
  tasks: Task[];
};

function getDbPath(): string {
  // Vercel/serverless environments generally don't allow writing to the repo
  // filesystem; /tmp is writable but ephemeral. For a real deployment, replace
  // this with a durable store (Vercel KV/Postgres, etc.).
  if (process.env.TRUSTNET_DB_PATH) {
    return process.env.TRUSTNET_DB_PATH;
  }
  if (process.env.VERCEL) {
    return path.join("/tmp", "trustnet-db.json");
  }
  return path.join(process.cwd(), "data", "db.json");
}

const DB_PATH = getDbPath();

async function ensureDb(): Promise<void> {
  try {
    await fs.access(DB_PATH);
  } catch {
    await fs.mkdir(path.dirname(DB_PATH), { recursive: true });
    const initial: Db = { tasks: [] };
    await fs.writeFile(DB_PATH, JSON.stringify(initial, null, 2), "utf-8");
  }
}

export async function readDb(): Promise<Db> {
  await ensureDb();
  const raw = await fs.readFile(DB_PATH, "utf-8");
  return JSON.parse(raw) as Db;
}

export async function writeDb(db: Db): Promise<void> {
  await fs.writeFile(DB_PATH, JSON.stringify(db, null, 2), "utf-8");
}

export async function updateDb<T>(
  updater: (db: Db) => T | Promise<T>
): Promise<T> {
  const db = await readDb();
  const result = await updater(db);
  await writeDb(db);
  return result;
}

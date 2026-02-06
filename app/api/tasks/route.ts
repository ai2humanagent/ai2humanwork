import { NextResponse } from "next/server";
import { readDb, updateDb } from "../../lib/store";

export const runtime = "nodejs";

export async function GET() {
  const db = await readDb();
  return NextResponse.json(db.tasks);
}

export async function POST(request: Request) {
  const body = await request.json();
  const title = String(body.title || "").trim();
  const budget = String(body.budget || "").trim();
  const deadline = String(body.deadline || "").trim();
  const acceptance = String(body.acceptance || "").trim();

  if (!title) {
    return NextResponse.json({ error: "Title is required" }, { status: 400 });
  }

  const now = new Date().toISOString();
  const task = {
    id: crypto.randomUUID(),
    title,
    budget: budget || "TBD",
    deadline: deadline || "TBD",
    acceptance: acceptance || "Provide evidence/logs",
    status: "created" as const,
    createdAt: now,
    updatedAt: now,
    evidence: []
  };

  await updateDb((db) => {
    db.tasks.unshift(task);
  });

  return NextResponse.json(task, { status: 201 });
}

import { NextResponse } from "next/server";
import { makeSeedTasks, readDb, updateDb } from "../../../lib/store";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const countRaw = Number(body.count ?? 60);
  const count = Number.isFinite(countRaw) ? Math.max(1, Math.min(120, countRaw)) : 60;

  const before = await readDb();
  const next = makeSeedTasks(count);

  await updateDb((db) => {
    // Put seeded tasks at the top so you immediately see a full feed.
    db.tasks = [...next, ...db.tasks].slice(0, 240);
  });

  const after = await readDb();
  return NextResponse.json({
    ok: true,
    before: before.tasks.length,
    added: count,
    after: after.tasks.length
  });
}


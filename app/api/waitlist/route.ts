import { NextResponse } from "next/server";
import { readDb, updateDb, WaitlistEntry } from "../../lib/store";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = await request.json();
  const email = String(body.email || "").trim().toLowerCase();
  const source = String(body.source || "landing").trim() || "landing";

  if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
    return NextResponse.json({ error: "Valid email is required." }, { status: 400 });
  }

  const result = await updateDb((db) => {
    const existing = db.waitlist.find((entry) => entry.email === email);
    if (existing) {
      return { entry: existing, count: db.waitlist.length };
    }

    const entry: WaitlistEntry = {
      id: crypto.randomUUID(),
      email,
      source,
      createdAt: new Date().toISOString()
    };

    db.waitlist.unshift(entry);

    return { entry, count: db.waitlist.length };
  });

  return NextResponse.json(result, { status: 201 });
}

export async function GET() {
  const db = await readDb();
  return NextResponse.json({ count: db.waitlist.length });
}

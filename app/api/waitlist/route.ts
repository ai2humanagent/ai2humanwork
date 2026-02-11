import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { readDb, updateDb, WaitlistEntry } from "../../lib/store";

export const runtime = "nodejs";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase =
  SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY
    ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
        auth: { persistSession: false }
      })
    : null;

export async function POST(request: Request) {
  const body = await request.json();
  const email = String(body.email || "").trim().toLowerCase();
  const source = String(body.source || "landing").trim() || "landing";

  if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
    return NextResponse.json({ error: "Valid email is required." }, { status: 400 });
  }

  if (supabase) {
    const { data: existing, error: lookupError } = await supabase
      .from("waitlist")
      .select("id")
      .eq("email", email)
      .maybeSingle();

    if (lookupError) {
      return NextResponse.json({ error: lookupError.message }, { status: 500 });
    }

    if (!existing) {
      const { error: insertError } = await supabase.from("waitlist").insert({
        email,
        source
      });

      if (insertError) {
        return NextResponse.json({ error: insertError.message }, { status: 500 });
      }
    }

    const { count, error: countError } = await supabase
      .from("waitlist")
      .select("*", { count: "exact", head: true });

    if (countError) {
      return NextResponse.json({ error: countError.message }, { status: 500 });
    }

    return NextResponse.json(
      { entry: existing ?? { email, source }, count: count ?? 0 },
      { status: 201 }
    );
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
  if (supabase) {
    const { count, error } = await supabase
      .from("waitlist")
      .select("*", { count: "exact", head: true });
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ count: count ?? 0 });
  }

  const db = await readDb();
  return NextResponse.json({ count: db.waitlist.length });
}

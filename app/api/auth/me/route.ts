import { NextResponse } from "next/server";
import { getAuthContext, sanitizeUser } from "../../../lib/auth";
import { readDb } from "../../../lib/store";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const auth = await getAuthContext(request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const db = await readDb();
  const human = auth.user.humanId
    ? db.humans.find((item) => item.id === auth.user.humanId) || null
    : null;
  const services = human
    ? db.services.filter((item) => item.providerId === human.id)
    : [];

  return NextResponse.json({
    user: sanitizeUser(auth.user),
    human,
    services
  });
}

import { NextResponse } from "next/server";
import { readDb } from "../../../lib/store";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const db = await readDb();
  const service = db.services.find((item) => item.id === params.id);
  if (!service) {
    return NextResponse.json({ error: "Service not found" }, { status: 404 });
  }

  const provider = db.humans.find((human) => human.id === service.providerId);
  if (!provider) {
    return NextResponse.json({ error: "Provider not found" }, { status: 404 });
  }

  return NextResponse.json({ service, provider });
}


import { NextResponse } from "next/server";
import { getAuthContext } from "../../../lib/auth";
import { readDb, updateDb } from "../../../lib/store";

export const runtime = "nodejs";

function normalizeList(input: unknown, max: number): string[] {
  const items = Array.isArray(input) ? input : String(input || "").split(",");
  return items
    .map((item) => String(item).trim())
    .filter(Boolean)
    .slice(0, max);
}

function normalizeNumber(input: unknown, fallback: number) {
  const value = Number(input);
  return Number.isFinite(value) ? Math.max(1, value) : fallback;
}

function normalizeAvatarUrl(input: unknown): string | undefined {
  const value = String(input || "").trim();
  if (!value) return undefined;
  if (value.length > 350_000) return undefined;
  if (!/^data:image\/(png|jpe?g|webp);base64,[a-z0-9+/=]+$/i.test(value)) return undefined;
  return value;
}

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const db = await readDb();
  const profile = db.humans.find((human) => human.id === params.id) || null;
  const linkedUser = db.users.find((user) => user.humanId === params.id) || null;

  if (!profile) {
    return NextResponse.json({ error: "Human profile not found" }, { status: 404 });
  }

  return NextResponse.json({
    ...profile,
    walletAddress: linkedUser?.walletAddress
  });
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  const auth = await getAuthContext(request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const body = await request.json().catch(() => ({}));
  let updated = null;
  let forbidden = false;

  await updateDb((db) => {
    const user = db.users.find((item) => item.id === auth.user.id);
    if (!user || !user.humanId || user.humanId !== params.id) {
      forbidden = true;
      return;
    }

    const found = db.humans.find((human) => human.id === params.id);
    if (!found) return;

    const next = {
      ...found,
      name: String(body.name ?? found.name).trim() || found.name,
      role: String(body.role ?? found.role ?? "").trim(),
      location: String(body.location ?? found.location ?? "").trim(),
      city: String(body.city ?? found.city).trim() || found.city,
      country: String(body.country ?? found.country).trim() || found.country,
      hourlyRate: normalizeNumber(body.hourlyRate, found.hourlyRate),
      languages: body.languages !== undefined
        ? normalizeList(body.languages, 20)
        : found.languages,
      skills: body.skills !== undefined
        ? normalizeList(body.skills, 50)
        : found.skills,
      avatarUrl: body.avatarUrl !== undefined
        ? normalizeAvatarUrl(body.avatarUrl)
        : found.avatarUrl
    };

    Object.assign(found, next);
    updated = found;
  });

  if (forbidden) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  if (!updated) {
    return NextResponse.json({ error: "Human profile not found" }, { status: 404 });
  }

  return NextResponse.json(updated);
}

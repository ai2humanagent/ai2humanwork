import { NextResponse } from "next/server";
import crypto from "crypto";
import { getAuthContext } from "../../lib/auth";
import { readDb, updateDb, type UserAccount } from "../../lib/store";

export const runtime = "nodejs";

function buildHandle(name: string, email: string): string {
  const base = (name || email.split("@")[0] || "human")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 20);
  return base || "human";
}

function ensureUniqueHandle(base: string, used: Set<string>): string {
  if (!used.has(base)) return base;
  let count = 2;
  while (used.has(`${base}_${count}`)) {
    count += 1;
  }
  return `${base}_${count}`;
}

function normalizeList(input: unknown, max: number): string[] {
  if (!Array.isArray(input)) return [];
  return input
    .map((item) => String(item).trim())
    .filter(Boolean)
    .slice(0, max);
}

function normalizeProfileInput(body: Record<string, unknown>, user: UserAccount) {
  const name = String(body.name || user.email.split("@")[0] || "New Human").trim();
  return {
    name,
    city: String(body.city || "").trim() || "Unknown",
    country: String(body.country || "").trim() || "Unknown",
    hourlyRate: Number.isFinite(Number(body.hourlyRate))
      ? Math.max(1, Number(body.hourlyRate))
      : 30,
    skills: normalizeList(body.skills, 50),
    languages: normalizeList(body.languages, 20)
  };
}

export async function GET(request: Request) {
  const db = await readDb();
  const url = new URL(request.url);
  const query = String(url.searchParams.get("q") || "")
    .trim()
    .toLowerCase();
  const verifiedOnly = url.searchParams.get("verified") === "1";
  const sort = String(url.searchParams.get("sort") || "top_rated").trim();

  let rows = db.humans.map((human) => {
    const humanServices = db.services.filter((service) => service.providerId === human.id);
    const categories = Array.from(new Set(humanServices.map((service) => service.category))).slice(0, 4);
    const linkedUser = db.users.find((user) => user.humanId === human.id) || null;
    return {
      human,
      serviceCount: humanServices.length,
      categories,
      walletAddress: linkedUser?.walletAddress,
      minPrice:
        humanServices.length > 0
          ? Math.min(...humanServices.map((service) => Number(service.price)))
          : human.hourlyRate
    };
  });

  if (verifiedOnly) {
    rows = rows.filter((row) => row.human.verified);
  }

  if (query) {
    rows = rows.filter((row) =>
      [
        row.human.name,
        row.human.city,
        row.human.country,
        row.human.skills.join(" "),
        row.human.languages.join(" "),
        row.categories.join(" ")
      ]
        .join(" ")
        .toLowerCase()
        .includes(query)
    );
  }

  if (sort === "top_rated") {
    rows.sort((a, b) => b.human.rating - a.human.rating);
  } else if (sort === "most_services") {
    rows.sort((a, b) => b.serviceCount - a.serviceCount);
  } else {
    rows.sort((a, b) => a.human.name.localeCompare(b.human.name));
  }

  return NextResponse.json({
    total: rows.length,
    rows
  });
}

export async function POST(request: Request) {
  const auth = await getAuthContext(request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  let profile = null;

  await updateDb((db) => {
    const user = db.users.find((item) => item.id === auth.user.id);
    if (!user) return;

    const input = normalizeProfileInput(body, user);

    if (user.humanId) {
      const existing = db.humans.find((item) => item.id === user.humanId);
      if (!existing) return;
      Object.assign(existing, input);
      profile = existing;
      return;
    }

    const usedHandles = new Set(db.humans.map((item) => item.handle));
    const handle = ensureUniqueHandle(buildHandle(input.name, user.email), usedHandles);

    const created = {
      id: `h_${crypto.randomUUID().slice(0, 12)}`,
      name: input.name,
      handle,
      city: input.city,
      country: input.country,
      verified: false,
      rating: 4.0,
      completedJobs: 0,
      hourlyRate: input.hourlyRate,
      skills: input.skills,
      languages: input.languages,
      avatarSeed: (db.humans.length % 8) + 1
    };

    db.humans.unshift(created);
    user.humanId = created.id;
    profile = created;
  });

  if (!profile) {
    return NextResponse.json({ error: "Unable to save profile." }, { status: 400 });
  }

  return NextResponse.json({ human: profile });
}

import { NextResponse } from "next/server";
import crypto from "crypto";
import { getAuthContext } from "../../lib/auth";
import { readDb, updateProfileDb } from "../../lib/store";
import type { UserAccount } from "../../lib/store";
import type { Human } from "../../lib/humanMarketplace";

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
  const items = Array.isArray(input) ? input : String(input || "").split(",");
  return items
    .map((item) => String(item).trim())
    .filter(Boolean)
    .slice(0, max);
}

function normalizeAvatarUrl(input: unknown): string | undefined {
  const value = String(input || "").trim();
  if (!value) return undefined;
  if (value.length > 350_000) return undefined;
  if (!/^data:image\/(png|jpe?g|webp);base64,[a-z0-9+/=]+$/i.test(value)) return undefined;
  return value;
}

function normalizeContactEmail(input: unknown): string | undefined {
  const value = String(input || "").trim().toLowerCase();
  if (!value) return undefined;
  if (value.length > 254) throw new Error("Email is too long.");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) throw new Error("Enter a valid email address.");
  if (value.endsWith("@privy.local")) throw new Error("Enter a real email address for notifications.");
  return value;
}

function normalizeNotificationPreferences(input: unknown) {
  const raw = input && typeof input === "object" ? input as Record<string, unknown> : {};
  return {
    emailTaskAlerts: raw.emailTaskAlerts !== false,
    emailRewardAlerts: raw.emailRewardAlerts !== false
  };
}

function normalizeProfileInput(body: Record<string, unknown>, user: UserAccount) {
  const name = String(body.name || user.email.split("@")[0] || "New Human").trim();
  return {
    name,
    role: String(body.role || "").trim() || "",
    location: String(body.location || "").trim() || "",
    city: String(body.city || "").trim() || "Unknown",
    country: String(body.country || "").trim() || "Unknown",
    hourlyRate: Number.isFinite(Number(body.hourlyRate))
      ? Math.max(1, Number(body.hourlyRate))
      : 30,
    skills: normalizeList(body.skills, 50),
    languages: normalizeList(body.languages, 20),
    avatarUrl: normalizeAvatarUrl(body.avatarUrl),
    contactEmail: normalizeContactEmail(body.contactEmail),
    notificationPreferences: normalizeNotificationPreferences(body.notificationPreferences)
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
  let input;
  try {
    input = normalizeProfileInput(body, auth.user);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Invalid profile input." },
      { status: 400 }
    );
  }
  let profile: Human | null = null;

  try {
    const result = await updateProfileDb<{ profile: Human | null }>((db) => {
      const user = db.users.find((item) => item.id === auth.user.id);
      if (!user) return { result: { profile: null } };

      user.contactEmail = input.contactEmail;
      user.notificationPreferences = input.notificationPreferences;

      if (user.humanId) {
        const existing = db.humans.find((item) => item.id === user.humanId);
        if (!existing) return { result: { profile: null }, user };
        const nextInput = { ...input };
        if (body.avatarUrl === undefined) {
          delete nextInput.avatarUrl;
        }
        Object.assign(existing, nextInput);
        return {
          result: { profile: existing },
          user,
          human: existing
        };
      }

      const usedHandles = new Set(db.humans.map((item) => item.handle));
      const handle = ensureUniqueHandle(buildHandle(input.name, user.email), usedHandles);

      const created: Human = {
        id: `h_${crypto.randomUUID().slice(0, 12)}`,
        name: input.name,
        handle,
        role: input.role,
        location: input.location,
        city: input.city,
        country: input.country,
        verified: false,
        rating: 4.0,
        completedJobs: 0,
        hourlyRate: input.hourlyRate,
        skills: input.skills,
        languages: input.languages,
        avatarSeed: (db.humans.length % 8) + 1,
        ...(input.avatarUrl ? { avatarUrl: input.avatarUrl } : {})
      };

      db.humans.unshift(created);
      user.humanId = created.id;

      return {
        result: { profile: created },
        user,
        human: created
      };
    });
    profile = result.profile;
  } catch (error) {
    console.error("[Profile] save failed:", error);
    return NextResponse.json({ error: "Unable to save profile." }, { status: 500 });
  }

  if (!profile) {
    return NextResponse.json({ error: "Unable to save profile." }, { status: 400 });
  }

  return NextResponse.json({ human: profile });
}

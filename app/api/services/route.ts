import { NextResponse } from "next/server";
import crypto from "crypto";
import { getAuthContext } from "../../lib/auth";
import { listCategories } from "../../lib/humanMarketplace";
import type { ServiceCategory } from "../../lib/humanMarketplace";
import { readDb, updateDb } from "../../lib/store";
import type { HumanService } from "../../lib/humanMarketplace";

export const runtime = "nodejs";

const validCategories = new Set<string>(listCategories());

export async function GET(request: Request) {
  const db = await readDb();
  const url = new URL(request.url);
  const query = String(url.searchParams.get("q") || "")
    .trim()
    .toLowerCase();
  const category = String(url.searchParams.get("category") || "").trim();
  const verifiedOnly = url.searchParams.get("verified") === "1";
  const sort = String(url.searchParams.get("sort") || "top_rated").trim();

  let rows = db.services
    .map((service) => {
      const provider = db.humans.find((human) => human.id === service.providerId);
      if (!provider) return null;
      return { service, provider };
    })
    .filter((item): item is NonNullable<typeof item> => Boolean(item));

  if (category && category !== "all") {
    rows = rows.filter((row) => row.service.category === category);
  }

  if (verifiedOnly) {
    rows = rows.filter((row) => row.service.verified || row.provider.verified);
  }

  if (query) {
    rows = rows.filter((row) =>
      [
        row.service.title,
        row.service.shortDescription,
        row.service.description,
        row.provider.name,
        row.provider.city,
        row.provider.country
      ]
        .join(" ")
        .toLowerCase()
        .includes(query)
    );
  }

  if (sort === "top_rated") {
    rows.sort((a, b) => b.service.ratingCount - a.service.ratingCount);
  } else {
    rows.sort((a, b) => a.service.title.localeCompare(b.service.title));
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

  const body = await request.json().catch(() => ({}));
  const title = String(body.title || "").trim();
  const shortDescription = String(body.shortDescription || "").trim();
  const description = String(body.description || shortDescription).trim();
  const categoryRaw = String(body.category || "").trim();
  const pricing = String(body.pricing || "fixed").trim() === "hourly" ? "hourly" : "fixed";
  const price = Number(body.price);
  const durationMinutes = Number(body.durationMinutes);

  if (!title || !shortDescription) {
    return NextResponse.json(
      { error: "title and shortDescription are required." },
      { status: 400 }
    );
  }
  if (!validCategories.has(categoryRaw)) {
    return NextResponse.json({ error: "Invalid category." }, { status: 400 });
  }
  if (!Number.isFinite(price) || price <= 0) {
    return NextResponse.json({ error: "Invalid price." }, { status: 400 });
  }

  const category = categoryRaw as ServiceCategory;
  let created: HumanService | null = null;

  await updateDb((db) => {
    const user = db.users.find((item) => item.id === auth.user.id);
    if (!user || !user.humanId) return;

    const provider = db.humans.find((item) => item.id === user.humanId);
    if (!provider) return;

    created = {
      id: `svc_${crypto.randomUUID().slice(0, 12)}`,
      providerId: provider.id,
      title,
      shortDescription,
      description,
      category,
      price: Math.round(price * 100) / 100,
      pricing: pricing as "fixed" | "hourly",
      durationMinutes: Number.isFinite(durationMinutes) && durationMinutes > 0 ? durationMinutes : 60,
      verified: false,
      ratingCount: 0
    };

    db.services.unshift(created);
  });

  if (!created) {
    return NextResponse.json(
      { error: "Create a human profile before publishing services." },
      { status: 400 }
    );
  }

  return NextResponse.json({ service: created }, { status: 201 });
}

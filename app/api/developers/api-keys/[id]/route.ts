import { NextResponse } from "next/server";
import { getAuthContext } from "../../../../lib/auth";
import { updateProfileDb } from "../../../../lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthContext(request);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { id } = await params;
  const revokedAt = new Date().toISOString();
  const revoked = await updateProfileDb((db) => {
    const user = db.users.find((item) => item.id === auth.user.id);
    if (!user) throw new Error("Session user not found.");
    const key = user.developerApiKeys?.find((item) => item.id === id);
    if (!key) return { result: false, user: null };
    key.state = "revoked";
    key.revokedAt = revokedAt;
    return { result: true, user };
  });
  if (!revoked) return NextResponse.json({ error: "API key not found." }, { status: 404 });

  return NextResponse.json({ ok: true, id, state: "revoked", revokedAt });
}

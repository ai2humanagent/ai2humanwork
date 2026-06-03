import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { getAdminAuthFromCookieHeader } from "../../lib/adminAuth";
import AdminLoginClient from "./AdminLoginClient";

export const dynamic = "force-dynamic";

async function buildCookieHeader() {
  const cookieStore = await cookies();
  return cookieStore
    .getAll()
    .map((cookie) => `${cookie.name}=${encodeURIComponent(cookie.value)}`)
    .join("; ");
}

export default async function AdminLoginPage({
  searchParams
}: {
  searchParams?: Promise<{ from?: string; admin_error?: string }>;
}) {
  const auth = await getAdminAuthFromCookieHeader(await buildCookieHeader());
  const params = await searchParams;
  const from = params?.from || "/app/admin";

  if (auth.ok) {
    redirect(from.startsWith("/") ? from : "/app/admin");
  }

  return <AdminLoginClient from={from} adminError={params?.admin_error || ""} />;
}

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getAdminAuthFromCookieHeader } from "../../lib/adminAuth";
import AdminClient from "./AdminClient";

export const dynamic = "force-dynamic";

async function buildCookieHeader() {
  const cookieStore = await cookies();
  return cookieStore
    .getAll()
    .map((cookie) => `${cookie.name}=${encodeURIComponent(cookie.value)}`)
    .join("; ");
}

export default async function AdminPage() {
  const auth = await getAdminAuthFromCookieHeader(await buildCookieHeader());
  if (!auth.ok) {
    redirect(`/app/profile?admin_error=${auth.status}`);
  }

  return <AdminClient />;
}

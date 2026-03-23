import { redirect } from "next/navigation";

export default function FallbackOrdersRedirectPage() {
  redirect("/app/orders");
}

// Mock "delivery confirmation" evidence service for the generic demo.
// In production this would be a carrier API / delivery system integration.

const MOCK_DELIVERIES: Record<string, { status: string; deliveredAt: string; orderId: string }> = {
  "ORD-1001": { status: "delivered", deliveredAt: "2026-08-20T12:00:00Z", orderId: "ORD-1001" },
  "ORD-1002": { status: "in_transit", deliveredAt: "", orderId: "ORD-1002" }
};

export function checkDeliveryReference(referenceId: string) {
  const record = MOCK_DELIVERIES[String(referenceId || "").trim().toUpperCase()];
  if (!record) {
    return { found: false as const, status: "not_found" as const };
  }
  return { found: true as const, status: record.status as "delivered" | "in_transit", deliveredAt: record.deliveredAt, orderId: record.orderId };
}

export function isPlausibleGps(lat: number, lng: number): boolean {
  return Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180;
}

export function isValidImageHash(value: string): boolean {
  return /^sha256:[0-9a-f]{64}$/.test(String(value || "").trim().toLowerCase());
}

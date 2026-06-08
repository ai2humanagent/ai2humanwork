export function formatDateTimeUtc8(value: string | undefined | null) {
  if (!value) return "TBD";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Hong_Kong",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  }).formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value || "";
  return `${get("year")}/${get("month")}/${get("day")} ${get("hour")}:${get("minute")} (Hong Kong time, UTC+08:00)`;
}

export function formatCampaignWindowUtc8(deadline: string | undefined | null, daysBefore = 7) {
  if (!deadline) return "No deadline";
  const end = new Date(deadline);
  if (Number.isNaN(end.getTime())) return deadline;
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - daysBefore);
  return `${formatDateTimeUtc8(start.toISOString()).replace(" (Hong Kong time, UTC+08:00)", "")} ~ ${formatDateTimeUtc8(end.toISOString())}`;
}

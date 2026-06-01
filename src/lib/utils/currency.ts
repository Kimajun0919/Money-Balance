export function formatKrw(value: number) {
  return `${Math.round(value).toLocaleString("ko-KR")}원`;
}

export function formatCompactKrw(value: number) {
  return new Intl.NumberFormat("ko-KR", {
    style: "currency",
    currency: "KRW",
    maximumFractionDigits: 0,
    notation: "compact"
  }).format(value);
}

export function parseNumberInput(value: FormDataEntryValue | null) {
  if (value === null) return 0;
  const normalized = String(value).replaceAll(",", "").trim();
  if (normalized === "") return 0;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

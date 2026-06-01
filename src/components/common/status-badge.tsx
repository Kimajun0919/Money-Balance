import type { RebalanceStatus } from "@/lib/types";
import { STATUS_LABELS } from "@/lib/utils/labels";

const statusClass: Record<RebalanceStatus, string> = {
  cash_shortage: "border-amber-300 bg-amber-50 text-amber-900",
  risk_excess: "border-rose-300 bg-rose-50 text-rose-900",
  illusion_warning: "border-orange-300 bg-orange-50 text-orange-900",
  allocation_gap: "border-teal-300 bg-teal-50 text-teal-900",
  return_gap: "border-indigo-300 bg-indigo-50 text-indigo-900",
  maintain: "border-neutral-300 bg-neutral-50 text-neutral-700"
};

export function StatusBadge({ status }: { status: RebalanceStatus }) {
  return (
    <span
      className={`inline-flex h-7 items-center rounded-md border px-2.5 text-xs font-semibold ${statusClass[status]}`}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}

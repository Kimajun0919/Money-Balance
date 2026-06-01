import type { ReactNode } from "react";

type Tone = "neutral" | "mint" | "saffron" | "berry";

const toneClass: Record<Tone, string> = {
  neutral: "border-line bg-white",
  mint: "border-mint/25 bg-teal-50",
  saffron: "border-amber-300 bg-amber-50",
  berry: "border-rose-200 bg-rose-50"
};

export function MetricCard({
  title,
  value,
  caption,
  tone = "neutral",
  icon
}: {
  title: string;
  value: ReactNode;
  caption?: ReactNode;
  tone?: Tone;
  icon?: ReactNode;
}) {
  return (
    <section
      className={`min-h-32 rounded-md border p-4 shadow-panel ${toneClass[tone]}`}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium text-neutral-600">{title}</p>
        {icon ? <span className="text-neutral-500">{icon}</span> : null}
      </div>
      <div className="mt-3 text-2xl font-bold text-ink">{value}</div>
      {caption ? (
        <div className="mt-2 text-sm leading-5 text-neutral-600">{caption}</div>
      ) : null}
    </section>
  );
}

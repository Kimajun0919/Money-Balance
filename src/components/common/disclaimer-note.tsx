import { REQUIRED_DISCLAIMER } from "@/lib/constants/disclaimer";

export function DisclaimerNote() {
  return (
    <p className="mt-8 rounded-md border border-line bg-white px-4 py-3 text-sm leading-6 text-neutral-600 shadow-panel">
      {REQUIRED_DISCLAIMER}
    </p>
  );
}

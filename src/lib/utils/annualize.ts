import type { PriceChangePeriodType } from "@/lib/types";
import { roundTo } from "@/lib/utils/percentage";

const PERIOD_MONTHS: Record<Exclude<PriceChangePeriodType, "custom">, number> = {
  "1m": 1,
  "3m": 3,
  "6m": 6,
  "1y": 12,
  since_purchase: 12
};

export function monthsBetween(startDate?: string, endDate?: string) {
  if (!startDate || !endDate) return 12;
  const start = new Date(startDate);
  const end = new Date(endDate);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 12;
  const years = end.getFullYear() - start.getFullYear();
  const months = end.getMonth() - start.getMonth();
  const days = (end.getDate() - start.getDate()) / 30;
  return Math.max(1, years * 12 + months + days);
}

export function getPeriodMonths(
  periodType: PriceChangePeriodType | undefined,
  startDate?: string,
  endDate?: string
) {
  if (!periodType) return 12;
  if (periodType === "custom") return monthsBetween(startDate, endDate);
  if (periodType === "since_purchase") {
    return monthsBetween(startDate, endDate ?? new Date().toISOString());
  }
  return PERIOD_MONTHS[periodType];
}

export function annualizeReturn(inputReturn: number, months: number) {
  if (months <= 0) return inputReturn;
  return roundTo((1 + inputReturn) ** (12 / months) - 1, 8);
}

export function annualizePriceChangeRate(params: {
  priceChangeRate: number;
  periodType?: PriceChangePeriodType;
  startDate?: string;
  endDate?: string;
}) {
  if (!params.priceChangeRate) return 0;
  const months = getPeriodMonths(
    params.periodType,
    params.startDate,
    params.endDate
  );
  return annualizeReturn(params.priceChangeRate, months);
}

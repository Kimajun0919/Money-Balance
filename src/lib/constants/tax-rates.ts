import type { AccountType, AssetType } from "@/lib/types";

export const ACCOUNT_TYPE_LABELS: Record<AccountType, string> = {
  general: "일반",
  isa: "ISA",
  pension: "연금",
  irp: "IRP",
  tax_free: "비과세",
  unknown: "미정"
};

export interface TaxRateSetting {
  accountType: AccountType;
  assetType: AssetType | "all";
  incomeTaxRate: number;
  capitalGainTaxRate: number;
  description: string;
  isActive: boolean;
}

export const TAX_RATE_SETTINGS: TaxRateSetting[] = [
  {
    accountType: "general",
    assetType: "all",
    incomeTaxRate: 0.154,
    capitalGainTaxRate: 0.154,
    description: "일반 계좌 기본 참고 세율",
    isActive: true
  },
  {
    accountType: "isa",
    assetType: "all",
    incomeTaxRate: 0.099,
    capitalGainTaxRate: 0.099,
    description: "ISA 계좌 참고 세율",
    isActive: true
  },
  {
    accountType: "pension",
    assetType: "all",
    incomeTaxRate: 0.055,
    capitalGainTaxRate: 0.055,
    description: "연금 계좌 참고 세율",
    isActive: true
  },
  {
    accountType: "irp",
    assetType: "all",
    incomeTaxRate: 0.055,
    capitalGainTaxRate: 0.055,
    description: "IRP 계좌 참고 세율",
    isActive: true
  },
  {
    accountType: "tax_free",
    assetType: "all",
    incomeTaxRate: 0,
    capitalGainTaxRate: 0,
    description: "비과세로 입력한 경우의 참고 세율",
    isActive: true
  },
  {
    accountType: "unknown",
    assetType: "all",
    incomeTaxRate: 0.154,
    capitalGainTaxRate: 0.154,
    description: "계좌 유형 미정 기본 참고 세율",
    isActive: true
  }
];

export function getDefaultTaxRate(
  accountType: AccountType,
  assetType: AssetType
): TaxRateSetting {
  return (
    TAX_RATE_SETTINGS.find(
      (setting) =>
        setting.accountType === accountType && setting.assetType === assetType
    ) ??
    TAX_RATE_SETTINGS.find(
      (setting) =>
        setting.accountType === accountType && setting.assetType === "all"
    ) ??
    TAX_RATE_SETTINGS[0]
  );
}

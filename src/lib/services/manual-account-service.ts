import {
  createFinancialAccount,
  updateFinancialAccount,
  type ManualFinancialAccountInput
} from "@/lib/services/financial-account-service";
import { createId } from "@/lib/services/service-utils";
import type { AppState, FinancialAccountType, Liability } from "@/lib/types";

export const MANUAL_ACCOUNT_TYPES: FinancialAccountType[] = [
  "bank_checking",
  "bank_savings",
  "installment_savings",
  "cash",
  "securities_cash",
  "domestic_stock",
  "overseas_stock",
  "etf",
  "bond",
  "pension",
  "loan",
  "other_asset",
  "other_liability"
];

function isLiabilityType(accountType: FinancialAccountType) {
  return accountType === "loan" || accountType === "other_liability";
}

export function createManualAccount(
  state: AppState,
  input: ManualFinancialAccountInput
) {
  const result = createFinancialAccount(state, input);

  if (!isLiabilityType(result.account.accountType)) {
    return result;
  }

  const now = new Date().toISOString();
  const liability: Liability = {
    id: createId("liability"),
    financialAccountId: result.account.id,
    name: result.account.accountAlias,
    liabilityType: result.account.accountType === "loan" ? "credit_loan" : "other",
    currency: result.account.currency,
    principalAmount:
      result.account.principalAmount ??
      Math.abs(result.account.liabilityAmountKrw ?? result.account.balance),
    currentBalance: Math.abs(
      result.account.liabilityAmountKrw ?? result.account.balance
    ),
    valuationAmountKrw: Math.abs(
      result.account.liabilityAmountKrw ?? result.account.balance
    ),
    isManual: true,
    createdAt: now,
    updatedAt: now
  };

  return {
    account: result.account,
    state: {
      ...result.state,
      liabilities: [liability, ...result.state.liabilities]
    }
  };
}

export function updateManualAccount(
  state: AppState,
  accountId: string,
  updates: Partial<ManualFinancialAccountInput>
) {
  return updateFinancialAccount(state, accountId, updates);
}

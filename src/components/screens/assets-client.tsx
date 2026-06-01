"use client";

import { useEffect, useMemo, useState } from "react";
import { Database, Plus, Trash2 } from "lucide-react";
import {
  ASSET_TYPE_ORDER,
  ASSET_TYPE_SETTINGS,
  RISK_LEVEL_LABELS
} from "@/lib/constants/asset-types";
import { getDefaultTaxRate } from "@/lib/constants/tax-rates";
import type { AccountType, AssetType, PriceChangePeriodType } from "@/lib/types";
import { ACCOUNT_LABELS } from "@/lib/utils/labels";
import { formatKrw } from "@/lib/utils/currency";
import {
  formatPercent,
  fromPercentValue,
  toPercentValue
} from "@/lib/utils/percentage";
import {
  createAssetFromInput,
  getDefaultAssetInput
} from "@/lib/utils/asset-factory";
import type { AssetInput } from "@/lib/validators/asset-validator";
import { validateAssetInput } from "@/lib/validators/asset-validator";
import { useAppState } from "@/hooks/use-app-state";
import { createSampleAssets } from "@/lib/storage/default-state";
import { DisclaimerNote } from "@/components/common/disclaimer-note";
import { logKpiEvent } from "@/lib/kpi/event-logger";

const accountOptions: AccountType[] = [
  "general",
  "isa",
  "pension",
  "irp",
  "tax_free",
  "unknown"
];
const periodOptions: PriceChangePeriodType[] = [
  "1m",
  "3m",
  "6m",
  "1y",
  "since_purchase",
  "custom"
];
const periodLabels: Record<PriceChangePeriodType, string> = {
  "1m": "1개월",
  "3m": "3개월",
  "6m": "6개월",
  "1y": "1년",
  since_purchase: "매수 이후",
  custom: "직접 기간"
};

export function AssetsClient() {
  const { state, updateState, loaded } = useAppState();
  const [form, setForm] = useState<AssetInput>(() =>
    getDefaultAssetInput("cash", state.profile.defaultAccountType)
  );
  const validation = useMemo(() => validateAssetInput(form), [form]);
  const selectedSetting = ASSET_TYPE_SETTINGS[form.assetType];

  useEffect(() => {
    if (!loaded) return;
    setForm(getDefaultAssetInput("cash", state.profile.defaultAccountType));
  }, [loaded, state.profile.defaultAccountType]);

  function updateForm(next: Partial<AssetInput>) {
    setForm((current) => ({ ...current, ...next }));
  }

  function changeAssetType(assetType: AssetType) {
    const defaults = getDefaultAssetInput(assetType, form.accountType);
    setForm((current) => ({
      ...current,
      assetType,
      incomeYield: defaults.incomeYield,
      expectedCapitalReturn: defaults.expectedCapitalReturn,
      incomeTaxRate: defaults.incomeTaxRate,
      capitalGainTaxRate: defaults.capitalGainTaxRate
    }));
  }

  function changeAccountType(accountType: AccountType) {
    const tax = getDefaultTaxRate(accountType, form.assetType);
    updateForm({
      accountType,
      incomeTaxRate: tax.incomeTaxRate,
      capitalGainTaxRate: tax.capitalGainTaxRate
    });
  }

  function addAsset() {
    if (!validation.valid) return;
    const asset = createAssetFromInput(form);
    const nextState = {
      ...state,
      assets: [...state.assets, asset]
    };
    updateState(nextState);
    logKpiEvent("asset_created", {
      assetType: asset.assetType,
      valuationAmountKrw: asset.valuationAmountKrw
    });
    setForm(getDefaultAssetInput(form.assetType, form.accountType));
  }

  function deleteAsset(assetId: string) {
    updateState({
      ...state,
      assets: state.assets.filter((asset) => asset.id !== assetId)
    });
  }

  function loadSampleAssets() {
    updateState({
      ...state,
      assets: createSampleAssets()
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-mint">자산 등록</p>
          <h1 className="mt-1 text-3xl font-bold text-ink">
            수동 자산 입력
          </h1>
        </div>
        <button
          type="button"
          onClick={loadSampleAssets}
          className="inline-flex h-10 items-center gap-2 rounded-md border border-line bg-white px-4 text-sm font-semibold text-neutral-700 hover:border-mint hover:text-mint"
        >
          <Database size={17} aria-hidden="true" />
          예시 자산 불러오기
        </button>
      </div>

      <section className="rounded-md border border-line bg-white p-5 shadow-panel">
        <div className="grid gap-5 lg:grid-cols-4">
          <label className="block lg:col-span-2">
            <span className="text-sm font-medium text-neutral-700">
              자산 이름
            </span>
            <input
              className="mt-2 h-11 w-full rounded-md border border-line px-3"
              value={form.assetName}
              onChange={(event) => updateForm({ assetName: event.target.value })}
              placeholder="예: 현금성 계좌"
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-neutral-700">자산군</span>
            <select
              className="mt-2 h-11 w-full rounded-md border border-line px-3"
              value={form.assetType}
              onChange={(event) => changeAssetType(event.target.value as AssetType)}
            >
              {ASSET_TYPE_ORDER.map((assetType) => (
                <option key={assetType} value={assetType}>
                  {ASSET_TYPE_SETTINGS[assetType].label}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-sm font-medium text-neutral-700">계좌 유형</span>
            <select
              className="mt-2 h-11 w-full rounded-md border border-line px-3"
              value={form.accountType}
              onChange={(event) =>
                changeAccountType(event.target.value as AccountType)
              }
            >
              {accountOptions.map((accountType) => (
                <option key={accountType} value={accountType}>
                  {ACCOUNT_LABELS[accountType]}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="mt-5 grid gap-5 lg:grid-cols-4">
          <label className="block">
            <span className="text-sm font-medium text-neutral-700">종목코드</span>
            <input
              className="mt-2 h-11 w-full rounded-md border border-line px-3 uppercase"
              value={form.ticker ?? ""}
              onChange={(event) =>
                updateForm({ ticker: event.target.value.toUpperCase() })
              }
              placeholder="예: SPY"
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-neutral-700">거래시장</span>
            <input
              className="mt-2 h-11 w-full rounded-md border border-line px-3 uppercase"
              value={form.market ?? ""}
              onChange={(event) =>
                updateForm({ market: event.target.value.toUpperCase() })
              }
              placeholder="예: NYSE"
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-neutral-700">통화</span>
            <input
              className="mt-2 h-11 w-full rounded-md border border-line px-3 uppercase"
              value={form.currency}
              onChange={(event) =>
                updateForm({ currency: event.target.value.toUpperCase() })
              }
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-neutral-700">평가금액</span>
            <input
              type="number"
              min={0}
              className="mt-2 h-11 w-full rounded-md border border-line px-3"
              value={form.valuationAmount}
              onChange={(event) =>
                updateForm({ valuationAmount: Number(event.target.value) })
              }
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-neutral-700">환율</span>
            <input
              type="number"
              min={0}
              className="mt-2 h-11 w-full rounded-md border border-line px-3"
              value={form.currency.toUpperCase() === "KRW" ? 1 : form.exchangeRate}
              disabled={form.currency.toUpperCase() === "KRW"}
              onChange={(event) =>
                updateForm({ exchangeRate: Number(event.target.value) })
              }
            />
          </label>
          <div className="rounded-md border border-line bg-neutral-50 p-3 lg:col-span-4">
            <p className="text-sm text-neutral-500">원화 환산 평가금액</p>
            <p className="mt-2 text-lg font-bold text-ink">
              {formatKrw(
                form.valuationAmount *
                  (form.currency.toUpperCase() === "KRW" ? 1 : form.exchangeRate)
              )}
            </p>
          </div>
        </div>

        <div className="mt-5 grid gap-5 lg:grid-cols-5">
          <PercentInput
            label="인컴수익률"
            value={form.incomeYield}
            onChange={(value) => updateForm({ incomeYield: value })}
          />
          <PercentInput
            label="기대 가격수익률"
            value={form.expectedCapitalReturn}
            onChange={(value) => updateForm({ expectedCapitalReturn: value })}
          />
          <PercentInput
            label="가격 변화율"
            value={form.priceChangeRate}
            onChange={(value) => updateForm({ priceChangeRate: value })}
          />
          <label className="block">
            <span className="text-sm font-medium text-neutral-700">
              가격 변화 기간
            </span>
            <select
              className="mt-2 h-11 w-full rounded-md border border-line px-3"
              value={form.priceChangePeriodType ?? "1y"}
              onChange={(event) =>
                updateForm({
                  priceChangePeriodType: event.target.value as PriceChangePeriodType
                })
              }
            >
              {periodOptions.map((option) => (
                <option key={option} value={option}>
                  {periodLabels[option]}
                </option>
              ))}
            </select>
          </label>
          <PercentInput
            label="환율 변화율"
            value={form.fxChangeRate}
            onChange={(value) => updateForm({ fxChangeRate: value })}
          />
        </div>

        <div className="mt-5 grid gap-5 lg:grid-cols-4">
          <PercentInput
            label="인컴 참고 세율"
            value={form.incomeTaxRate}
            onChange={(value) => updateForm({ incomeTaxRate: value })}
          />
          <PercentInput
            label="가격수익 참고 세율"
            value={form.capitalGainTaxRate}
            onChange={(value) => updateForm({ capitalGainTaxRate: value })}
          />
          <label className="block">
            <span className="text-sm font-medium text-neutral-700">수량</span>
            <input
              type="number"
              min={0}
              className="mt-2 h-11 w-full rounded-md border border-line px-3"
              value={form.quantity ?? ""}
              onChange={(event) =>
                updateForm({
                  quantity:
                    event.target.value === "" ? undefined : Number(event.target.value)
                })
              }
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-neutral-700">매입 단가</span>
            <input
              type="number"
              min={0}
              className="mt-2 h-11 w-full rounded-md border border-line px-3"
              value={form.purchaseUnitPrice ?? ""}
              onChange={(event) =>
                updateForm({
                  purchaseUnitPrice:
                    event.target.value === "" ? undefined : Number(event.target.value)
                })
              }
            />
          </label>
        </div>

        <div className="mt-5 rounded-md border border-line bg-neutral-50 p-3 text-sm text-neutral-700">
          선택 자산군 기본 위험도는 {RISK_LEVEL_LABELS[selectedSetting.riskLevel]}이고,
          위험계수는 {selectedSetting.riskCoefficient.toFixed(2)}입니다.
        </div>

        {[...validation.errors, ...validation.warnings, ...validation.confirmations].length > 0 ? (
          <div className="mt-4 space-y-2">
            {validation.errors.map((message) => (
              <p
                key={message}
                className="rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-900"
              >
                {message}
              </p>
            ))}
            {[...validation.warnings, ...validation.confirmations].map(
              (message) => (
                <p
                  key={message}
                  className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900"
                >
                  {message}
                </p>
              )
            )}
          </div>
        ) : null}

        <div className="mt-5 flex justify-end">
          <button
            type="button"
            onClick={addAsset}
            disabled={!validation.valid}
            className="inline-flex h-11 items-center gap-2 rounded-md bg-mint px-5 font-semibold text-white disabled:cursor-not-allowed disabled:bg-neutral-300"
          >
            <Plus size={18} aria-hidden="true" />
            자산 추가
          </button>
        </div>
      </section>

      <section className="rounded-md border border-line bg-white p-5 shadow-panel">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-bold text-ink">등록 자산</h2>
          <span className="text-sm text-neutral-500">{state.assets.length}개</span>
        </div>
        <div className="table-scroll mt-4 overflow-x-auto">
            <table className="w-full min-w-[980px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-line text-left text-neutral-500">
                <th className="py-3 pr-3">자산 이름</th>
                <th className="py-3 pr-3">자산군</th>
                <th className="py-3 pr-3">종목코드</th>
                <th className="py-3 pr-3 text-right">원화 평가금액</th>
                <th className="py-3 pr-3 text-right">기대수익률</th>
                <th className="py-3 pr-3 text-right">인컴수익률</th>
                <th className="py-3 pr-3">위험도</th>
                <th className="py-3 pr-3 text-right">관리</th>
              </tr>
            </thead>
            <tbody>
              {state.assets.map((asset) => (
                <tr key={asset.id} className="border-b border-line/70">
                  <td className="py-3 pr-3 font-medium">{asset.assetName}</td>
                  <td className="py-3 pr-3">
                    {ASSET_TYPE_SETTINGS[asset.assetType].label}
                  </td>
                  <td className="py-3 pr-3">
                    {asset.ticker ? `${asset.ticker} · ${asset.market}` : "-"}
                  </td>
                  <td className="py-3 pr-3 text-right">
                    {formatKrw(asset.valuationAmountKrw)}
                  </td>
                  <td className="py-3 pr-3 text-right">
                    {formatPercent(asset.expectedReturn)}
                  </td>
                  <td className="py-3 pr-3 text-right">
                    {formatPercent(asset.incomeYield)}
                  </td>
                  <td className="py-3 pr-3">
                    {RISK_LEVEL_LABELS[asset.riskLevel]}
                  </td>
                  <td className="py-3 pr-3 text-right">
                    <button
                      type="button"
                      onClick={() => deleteAsset(asset.id)}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-line text-neutral-600 hover:border-rose-300 hover:text-rose-700"
                      title="삭제"
                    >
                      <Trash2 size={17} aria-hidden="true" />
                    </button>
                  </td>
                </tr>
              ))}
              {state.assets.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-neutral-500">
                    등록된 자산이 없습니다.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      <DisclaimerNote />
    </div>
  );
}

function PercentInput({
  label,
  value,
  onChange
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-neutral-700">{label}</span>
      <div className="mt-2 flex h-11 items-center rounded-md border border-line bg-white px-3">
        <input
          type="number"
          step={0.1}
          className="h-9 min-w-0 flex-1 border-0 p-0 outline-none"
          value={toPercentValue(value)}
          onChange={(event) => onChange(fromPercentValue(Number(event.target.value)))}
        />
        <span className="text-sm text-neutral-500">%</span>
      </div>
    </label>
  );
}

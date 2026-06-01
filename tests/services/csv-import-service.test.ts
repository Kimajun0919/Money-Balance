import { describe, expect, it } from "vitest";
import { createDefaultState } from "@/lib/storage/default-state";
import {
  confirmCsvImport,
  getCsvTemplate,
  previewCsvImport
} from "@/lib/services/csv-import-service";
import { makeAsset } from "../helpers";

describe("csv-import-service", () => {
  it("유효한 CSV 행을 검증하고 자산을 생성한다", () => {
    const preview = previewCsvImport(createDefaultState(), {
      filename: "assets.csv",
      csvText: getCsvTemplate()
    });
    const imported = confirmCsvImport(preview.state, {
      jobId: preview.job.id
    });

    expect(preview.job.validRows).toBe(1);
    expect(imported.createdAssets).toHaveLength(1);
    expect(imported.job?.status).toBe("imported");
  });

  it("공식 자산군 코드가 아니면 검증 오류로 처리한다", () => {
    const preview = previewCsvImport(createDefaultState(), {
      filename: "bad.csv",
      csvText:
        "asset_name,asset_type,valuation_amount,currency,exchange_rate,account_type,income_yield,expected_capital_return,price_change_rate,price_change_period_type,fx_change_rate,income_tax_rate,capital_gain_tax_rate\n잘못된 자산,bad_type,1000,KRW,1,general,1,0,0,,0,0,0"
    });

    expect(preview.job.invalidRows).toBe(1);
  });

  it("외화 자산에 환율이 없으면 검증 오류로 처리한다", () => {
    const preview = previewCsvImport(createDefaultState(), {
      filename: "fx.csv",
      csvText:
        "asset_name,asset_type,valuation_amount,currency,exchange_rate,account_type,income_yield,expected_capital_return,price_change_rate,price_change_period_type,fx_change_rate,income_tax_rate,capital_gain_tax_rate\n외화 성장,growth,1000,USD,,general,1,5,0,,0,15.4,15.4"
    });

    expect(preview.job.invalidRows).toBe(1);
  });

  it("중복으로 보이는 자산은 경고 행으로 표시한다", () => {
    const state = {
      ...createDefaultState(),
      assets: [makeAsset({ assetType: "cash", amount: 1_000_000 })]
    };
    state.assets[0].assetName = "cash-테스트";
    const preview = previewCsvImport(state, {
      filename: "dup.csv",
      csvText:
        "asset_name,asset_type,valuation_amount,currency,exchange_rate,account_type,income_yield,expected_capital_return,price_change_rate,price_change_period_type,fx_change_rate,income_tax_rate,capital_gain_tax_rate\ncash-테스트,cash,1000000,KRW,1,general,1,0,0,,0,15.4,15.4"
    });

    expect(preview.job.warningRows).toBe(1);
  });
});

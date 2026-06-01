import { describe, expect, it } from "vitest";
import { createDefaultState } from "@/lib/storage/default-state";
import {
  confirmCsvImport,
  previewCsvImport
} from "@/lib/services/csv-import-service";
import { buildPortfolioReview } from "@/lib/engines/portfolio-review-engine";

describe("phase3 integration", () => {
  it("가져온 자산이 기존 계산 엔진과 스냅샷/리포트 생성 흐름으로 이어진다", () => {
    const csvText =
      "asset_name,asset_type,ticker,market,valuation_amount,currency,exchange_rate,quantity,purchase_unit_price,purchase_amount,purchase_date,income_yield,expected_capital_return,price_change_rate,price_change_period_type,price_change_start_date,price_change_end_date,fx_change_rate,income_tax_rate,capital_gain_tax_rate,account_type,broker_name,account_alias\nSPY ETF,growth,SPY,NYSE,5200,USD,1350,10,480,4800,,1,9,5,1y,,,0,15.4,22,general,모의증권,테스트";
    const preview = previewCsvImport(createDefaultState(), {
      filename: "phase3.csv",
      csvText,
      importType: "standard"
    });
    const imported = confirmCsvImport(preview.state, {
      jobId: preview.job.id,
      createSnapshot: true
    });
    const review = buildPortfolioReview(
      imported.state.profile,
      imported.state.assets
    );

    expect(imported.createdAssets).toHaveLength(1);
    expect(imported.state.snapshots).toHaveLength(1);
    expect(imported.state.monthlyReports).toHaveLength(1);
    expect(review.returns.totalAssetAmountKrw).toBeGreaterThan(0);
  });
});

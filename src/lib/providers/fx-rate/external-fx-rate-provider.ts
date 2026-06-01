import type {
  FxRateProvider,
  FxRateRequest,
  FxRateResult,
  HistoricalFxRateRequest
} from "@/lib/providers/fx-rate/fx-rate-provider";

export class ExternalFxRateProvider implements FxRateProvider {
  readonly providerName = "external-fx-rate-disabled";

  async getRate(_input: FxRateRequest): Promise<FxRateResult> {
    throw new Error(
      "실제 환율 API 설정이 없습니다. 환경 변수를 설정하기 전에는 모의 환율 공급자를 사용해야 합니다."
    );
  }

  async getHistoricalRate(
    _input: HistoricalFxRateRequest
  ): Promise<FxRateResult> {
    throw new Error(
      "실제 과거 환율 API 설정이 없습니다. 환경 변수를 설정하기 전에는 모의 환율 공급자를 사용해야 합니다."
    );
  }
}

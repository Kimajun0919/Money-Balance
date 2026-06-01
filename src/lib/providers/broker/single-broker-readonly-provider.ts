import { MockBrokerProvider } from "@/lib/providers/broker/mock-broker-provider";

export class SingleBrokerReadonlyProvider extends MockBrokerProvider {
  override readonly providerName = "single-broker-readonly-disabled";
  override readonly brokerName = "실제 증권사 연동 준비";

  private throwDisabled(): never {
    throw new Error(
      "실제 증권사 API 설정이 없습니다. 현재는 동일한 인터페이스의 모의 증권사 공급자만 사용할 수 있습니다."
    );
  }

  override async fetchHoldings() {
    return this.throwDisabled();
  }

  override async fetchCashBalances() {
    return this.throwDisabled();
  }

  override async sync() {
    return this.throwDisabled();
  }
}

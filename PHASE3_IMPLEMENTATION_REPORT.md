# Yield Balance Phase 3 구현 보고서

작성일: 2026-06-01

## 1. 구현 파일 목록

- 타입/상태: `src/lib/types.ts`, `src/lib/storage/default-state.ts`, `src/lib/storage/portfolio-storage.ts`
- 공급자: `src/lib/providers/market-data/*`, `src/lib/providers/fx-rate/*`, `src/lib/providers/broker/*`
- 서비스: `market-data-service.ts`, `fx-rate-service.ts`, `valuation-service.ts`, `data-freshness-service.ts`, `asset-classification-service.ts`, `asset-normalization-service.ts`, `broker-connection-service.ts`, `broker-sync-service.ts`, `token-encryption-service.ts`, `external-sync-service.ts`
- CSV 파서: `src/lib/parsers/csv/*`, `src/lib/services/csv-import-service.ts`
- 화면: `/settings/data-sources`, `/import/assets`, `/import/history`, `/connections/broker`, `/connections/broker/sync`, `/connections/logs`
- 테스트: `tests/phase3/*`
- 문서/설정: `README.md`, `.env.example`, `PHASE3_IMPLEMENTATION_REPORT.md`

## 2. 추가 DB 모델 및 마이그레이션 설명

`prisma/schema.prisma`에 `MarketPriceSnapshot`, `FxRateSnapshot`, `AssetPriceLink`, `ExternalConnection`, `ExternalSyncLog`, `ExternalAssetMapping`을 추가했습니다. `Asset`에는 티커, 시장, 증권사, 계좌 별칭, 외부 연결 ID, 평가 출처, 시세/환율 출처와 갱신 시각을 추가했습니다. Prisma migration 파일은 아직 만들지 않았습니다.

## 3. 시세 데이터 연동 구조

`MarketDataProvider` 인터페이스를 기준으로 현재가, 과거가격, 종목 검색을 분리했습니다. 기본 구현은 `MockMarketDataProvider`이며 실제 API 설정 전에는 외부 공급자가 오류를 반환합니다.

## 4. 환율 데이터 연동 구조

`FxRateProvider` 인터페이스를 기준으로 현재 환율과 과거 환율 조회를 분리했습니다. 기본 구현은 `MockFxRateProvider`이며 USD/KRW 등 주요 모의 환율을 제공합니다.

## 5. 평가금액 자동 업데이트 로직

`valuation-service.ts`가 수량, 현재가, 환율을 이용해 평가금액과 원화 환산 금액을 갱신합니다. 종목코드 또는 수량이 없으면 수동 평가금액을 유지하고, 매입금액은 덮어쓰지 않습니다.

## 6. CSV/Excel 가져오기 기능

표준 CSV 템플릿을 Phase 3 컬럼으로 확장했고, 일반 CSV 매핑을 위한 서비스 구조를 추가했습니다. Excel은 현재 브라우저에서 CSV로 저장한 뒤 업로드하는 방식으로 안내합니다.

## 7. 증권사 CSV 파서 구조

`BrokerCsvParser` 인터페이스와 표준 파서, 일반 CSV 파서를 추가했습니다. 증권사별 파서는 같은 인터페이스로 추가할 수 있습니다.

## 8. 자산군 자동 분류 로직

`asset-classification-service.ts`가 자산명, 티커, 시장, 상품 유형 단어를 기준으로 자산군과 신뢰도를 제안합니다. 사용자가 확인한 값은 자동 분류보다 우선합니다.

## 9. 단일 증권사 read-only 연동 구조

`BrokerProvider` 인터페이스와 `MockBrokerProvider`를 구현했습니다. 주문, 매수, 매도, 취소 관련 API는 인터페이스와 UI 어디에도 포함하지 않았습니다.

## 10. 토큰 암호화 및 보안 처리

`token-encryption-service.ts`는 Web Crypto AES-GCM으로 토큰을 암호화합니다. 연결 서비스는 암호문과 마스킹된 미리보기만 저장하며, 공개 반환값에는 토큰 필드를 포함하지 않습니다.

## 11. 동기화 로그 및 오류 처리

`ExternalSyncLog` 타입과 로그 화면을 추가했습니다. 브로커 연결, 미리보기, 반영, 삭제 작업은 성공/오류/경고 건수를 남깁니다.

## 12. 스냅샷 및 리포트 연동 방식

CSV 가져오기와 브로커 동기화 반영 후 사용자가 선택하면 기존 `createMonthlySnapshot`을 호출합니다. 따라서 기존 계산 엔진, 월간 리포트, 알림, 리밸런싱 제안 흐름을 그대로 재사용합니다.

## 13. 테스트 실행 방법

```bash
npm test
npm run prisma:generate
npm run build
```

PowerShell 실행 정책 때문에 필요한 경우 `cmd /c npm test` 형식으로 실행할 수 있습니다.

## 14. 통과한 테스트 목록

총 21개 테스트 파일, 55개 테스트가 통과했습니다. Phase 3 테스트는 시세, 환율, 평가금액, 데이터 신선도, 자산 분류, 자산 정규화, 브로커 연결/동기화, CSV 연동 통합 흐름을 포함합니다.

## 15. 남은 작업

- 실제 API 공급자 구현
- Prisma migration 작성과 localStorage 데이터 이전 UX
- 서버 API 또는 server action 전환
- 사용자 인증과 사용자별 데이터 격리
- Excel 원본 파일 파서
- Playwright 기반 E2E 테스트

## 16. 실제 API 연동 시 필요한 환경변수

`.env.example`에 `MARKET_DATA_API_KEY`, `FX_RATE_API_KEY`, `BROKER_CLIENT_ID`, `BROKER_CLIENT_SECRET`, `TOKEN_ENCRYPTION_SECRET` 예시를 추가했습니다. 실제 연동 시 서버 전용 환경 변수로 관리해야 합니다.

## 17. 법률 검토 및 외부 공개 제한 사항

외부 공개 전 투자자문, 개인정보, 전자금융, 수신 동의, 로그 보관, 토큰 저장 정책 검토가 필요합니다. 특정 종목 매수/매도 지시, 자동매매, 수익 보장 표현은 구현하지 않았고 금지 상태를 유지해야 합니다.

## 18. PRD Phase 3 대비 구현/미구현 항목

구현: 공급자 인터페이스, 모의 시세/환율, 평가금액 갱신, 신선도 경고, CSV 확장, 자산군 분류, 모의 브로커 연결, 토큰 암호화, 수동 동기화, 미리보기, 사용자 확인 후 반영, 동기화 로그, 스냅샷/리포트 연동.

미구현: 실제 시세 API, 실제 환율 API, 실제 증권사 API, Excel 바이너리 파서, 서버 DB 저장, 인증/인가, 실제 이메일/백그라운드 스케줄러.

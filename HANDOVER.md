# Yield Balance Handover

작성일: 2026-06-02  
프로젝트 경로: `d:\test\Money-Balance`  
현재 상태: Phase 0/1부터 Phase 6까지 구현된 Next.js localStorage 기반 개인 자산 관리 MVP

## 1. 핵심 요약

Yield Balance는 개인 1인이 직접 사용하는 비공개 투자 및 자산 관리 앱이다. 현재 구현은 목표 배분, 포트폴리오 계산, 스냅샷/리포트/알림, CSV 가져오기, 시장/환율/브로커 동기화, 개인 거래 보조, 자동 리밸런싱, 계좌 통합 조회, 순자산 계산, 실거래 리밸런싱 실행 검토를 포함한다.

중요한 전제:

- 현재 앱의 영구 저장소는 브라우저 `localStorage`의 `AppState`다.
- Prisma schema는 서버 저장소 전환을 위한 reference model이며, 현재 UI와 service는 DB를 직접 사용하지 않는다.
- KIS 관련 secret은 서버 route와 환경 변수에서만 다뤄야 한다.
- 실제 주문은 기본값으로 차단되어 있으며, 명시적 확인과 여러 safety gate를 통과해야 한다.
- Open Banking과 MyData는 공식 접근 권한이 없으면 disabled adapter로만 표시한다.

마지막 검증:

- `npm.cmd test`: 33개 테스트 파일, 107개 테스트 통과
- `npm.cmd run build`: 성공
- 기존 dev server: `http://localhost:3000`
- `/accounts`: HTTP 200 확인

## 2. 빠른 시작

PowerShell에서는 `npm.ps1` 실행 정책 때문에 `npm.cmd`를 쓰는 편이 안전하다.

```powershell
npm install
npm.cmd run dev
npm.cmd test
npm.cmd run build
```

기본 개발 서버:

```text
http://localhost:3000
```

Prisma Client 생성:

```powershell
npm.cmd run prisma:generate
```

## 3. 기술 스택

- Next.js App Router
- React
- TypeScript strict mode
- Tailwind CSS
- Recharts
- Prisma
- Vitest
- localStorage 기반 client state

주요 scripts:

- `npm run dev`: 개발 서버
- `npm run build`: 프로덕션 빌드
- `npm run start`: 빌드 결과 실행
- `npm test`: Vitest
- `npm run test:watch`: Vitest watch
- `npm run prisma:generate`: Prisma Client 생성
- `npm run prisma:seed`: seed 실행

## 4. 저장소 구조

중요 경로:

```text
prisma/
  schema.prisma

src/app/
  accounts/
  connections/
  dashboard/
  import/
  net-worth/
  rebalance/
  rebalancing/
  reports/
  settings/
  snapshots/
  target-portfolio/
  trading/
  trends/

src/components/
  common/
  layout/
  rebalancing/
  screens/

src/lib/
  constants/
  engines/
  providers/
  safety/
  services/
  storage/
  utils/
  validators/
  types.ts

tests/
  engines/
  phase3/
  phase4/
  phase5/
  phase6/
  services/
```

## 5. AppState와 localStorage

현재 source of truth는 `src/lib/types.ts`의 `AppState`다. 저장과 normalize는 `src/lib/storage/portfolio-storage.ts`가 담당하고, 기본값은 `src/lib/storage/default-state.ts`에서 만든다.

상태 모델 변경 시 반드시 같이 수정해야 하는 파일:

- `src/lib/types.ts`
- `src/lib/storage/default-state.ts`
- `src/lib/storage/portfolio-storage.ts`
- 필요 시 `prisma/schema.prisma`
- 관련 service tests

기존 localStorage 데이터 호환성이 중요하다. 새 배열이나 객체를 `AppState`에 추가할 때 normalize 기본값을 누락하면 기존 사용자의 화면이 깨질 수 있다.

## 6. Phase별 구현 상태

### Phase 0/1

목표수익률과 위험 허용도를 기반으로 자산군 목표 배분을 계산한다.

핵심 파일:

- `src/lib/engines/target-allocation-engine.ts`
- `src/lib/engines/return-calculation-engine.ts`
- `src/lib/engines/risk-score-engine.ts`
- `src/lib/engines/rebalance-engine.ts`
- `src/lib/engines/portfolio-review-engine.ts`

### Phase 2

관리형 MVP. 스냅샷, 리포트, 알림, CSV import, 월간 배분 계획을 포함한다.

핵심 파일:

- `src/lib/services/snapshot-service.ts`
- `src/lib/services/report-service.ts`
- `src/lib/services/monthly-allocation-plan-service.ts`
- `src/lib/services/rebalance-history-service.ts`
- `src/lib/services/trend-service.ts`
- `src/lib/services/notification-service.ts`
- `src/lib/services/email-service.ts`
- `src/lib/services/csv-import-service.ts`

### Phase 3

실데이터 연동 MVP. mock 시장 가격, mock 환율, mock 브로커, KIS read-only 잔고 조회 구조를 포함한다.

핵심 파일:

- `src/lib/providers/market-data/*`
- `src/lib/providers/fx-rate/*`
- `src/lib/providers/broker/*`
- `src/lib/services/market-data-service.ts`
- `src/lib/services/fx-rate-service.ts`
- `src/lib/services/valuation-service.ts`
- `src/lib/services/data-freshness-service.ts`
- `src/lib/services/broker-connection-service.ts`
- `src/lib/services/broker-sync-service.ts`
- `src/app/api/broker/kis/*`

### Phase 4

개인 거래 보조 MVP. 추천, 관심목록, 주문 제안, 안전 게이트, 샌드박스/실거래 구조, 중지 스위치, 감사 로그를 포함한다.

핵심 파일:

- `src/lib/safety/private-trading-gate.ts`
- `src/lib/services/recommendation-service.ts`
- `src/lib/services/watchlist-service.ts`
- `src/lib/services/order-proposal-service.ts`
- `src/lib/services/trade-risk-service.ts`
- `src/lib/services/broker-sandbox-trading-service.ts`
- `src/lib/services/auto-trading-service.ts`
- `src/lib/services/trading-profile-service.ts`
- `src/lib/services/trading-audit-service.ts`

### Phase 5

자동 리밸런싱 MVP. 드리프트 감지, 현금 우선 계획, 매도 보호, 정책/규칙, scheduler no-op, 실행 구조, 감사 로그를 포함한다.

핵심 파일:

- `src/lib/engines/rebalancing-drift-engine.ts`
- `src/lib/engines/rebalancing-plan-engine.ts`
- `src/lib/engines/rebalancing-risk-engine.ts`
- `src/lib/engines/rebalancing-execution-engine.ts`
- `src/lib/services/rebalancing-plan-service.ts`
- `src/lib/services/rebalancing-execution-service.ts`
- `src/lib/services/rebalancing-rule-service.ts`
- `src/lib/services/rebalancing-scheduler-service.ts`
- `src/lib/services/rebalancing-audit-service.ts`
- `src/lib/services/rebalancing-service.ts`

### Phase 6

계좌 통합 조회와 실거래 리밸런싱 실행 검토. BankSalad-like 계좌 집계, 연결 센터, 순자산 계산, mock 은행/증권 동기화, disabled Open Banking/MyData adapter, real rebalancing order batch/result 구조를 포함한다.

핵심 파일:

- `src/lib/services/account-aggregation-service.ts`
- `src/lib/services/financial-account-service.ts`
- `src/lib/services/institution-connection-service.ts`
- `src/lib/services/account-sync-service.ts`
- `src/lib/services/account-normalization-service.ts`
- `src/lib/services/net-worth-service.ts`
- `src/lib/services/account-valuation-service.ts`
- `src/lib/services/account-freshness-service.ts`
- `src/lib/services/account-deduplication-service.ts`
- `src/lib/services/manual-account-service.ts`
- `src/lib/services/account-audit-service.ts`
- `src/lib/services/real-rebalancing-execution-service.ts`
- `src/lib/services/providers/account/account-provider.ts`
- `src/lib/services/providers/banking/mock-bank-provider.ts`
- `src/lib/services/providers/broker/mock-securities-provider.ts`
- `src/lib/services/providers/broker/kis-account-provider.ts`
- `src/lib/services/providers/banking/disabled-open-banking-provider.ts`
- `src/lib/services/providers/mydata/disabled-mydata-provider.ts`

## 7. 주요 화면

### 기존 핵심 화면

- `/dashboard`: 현재 포트폴리오 요약
- `/assets`: 수동 자산 등록
- `/target-portfolio`: 목표 포트폴리오
- `/rebalance`: 수동 리밸런싱 참고
- `/rebalance/history`: 수동 리밸런싱 이력
- `/snapshots`: 스냅샷 목록
- `/snapshots/[id]`: 스냅샷 상세
- `/reports`: 월간 리포트 목록
- `/reports/[id]`: 리포트 상세
- `/trends`: 추이 차트
- `/notifications`: 알림 목록
- `/settings/notifications`: 알림 설정
- `/settings/data-sources`: 데이터 소스 설정
- `/import/csv`: CSV 가져오기
- `/import/assets`: 자산 가져오기
- `/import/history`: 가져오기 이력
- `/trading`: 개인 거래 보조
- `/rebalancing`: 리밸런싱 대시보드
- `/rebalancing/settings`: 리밸런싱 정책
- `/rebalancing/rules`: 리밸런싱 규칙
- `/rebalancing/plans/[id]`: 리밸런싱 계획 상세
- `/rebalancing/history`: 리밸런싱 실행 이력
- `/rebalancing/audit`: 리밸런싱 감사

### Phase 6 신규 화면

- `/accounts`: 전체 금융 현황, 순자산, 계좌/기관/자산군 요약, 수동 계좌 추가, mock 동기화
- `/accounts/[id]`: 계좌 상세, linked assets, sync history, warnings
- `/connections`: 통합 연결 센터
- `/connections/[id]`: 연결 상세
- `/connections/sync`: 계좌 동기화 미리보기 및 반영
- `/net-worth`: 순자산 계산과 월별 스냅샷
- `/rebalancing/execute/[planId]`: 실거래 리밸런싱 실행 검토

Sidebar는 `src/components/layout/app-shell.tsx`에 정의되어 있다.

## 8. Phase 6 데이터 모델

`AppState`에 추가된 필드:

- `financialInstitutions`
- `financialAccounts`
- `financialAccountAssetLinks`
- `accountSyncJobs`
- `accountSyncItems`
- `liabilities`
- `netWorthSnapshots`
- `accountAuditLogs`
- `realRebalancingOrderBatches`
- `realRebalancingOrderResults`

Prisma reference model:

- `FinancialInstitution`
- `FinancialAccount`
- `FinancialAccountAssetLink`
- `AccountSyncJob`
- `AccountSyncItem`
- `Liability`
- `NetWorthSnapshot`
- `RealRebalancingOrderBatch`
- `RealRebalancingOrderResult`

주의:

- raw external account number는 저장하지 않는다.
- external account id는 `hashExternalIdentifier`로 hash 처리한다.
- KIS connection은 `tokenPreview: "server-managed"`만 client state에 남긴다.
- Open Banking/MyData는 공식 접근 권한 없이는 실제 API 호출을 하지 않는다.

## 9. Phase 6 흐름

### 계좌 통합 조회

1. `/accounts` 진입
2. `buildAccountAggregationDashboard(state)` 호출
3. `calculateNetWorth(state)`로 총자산/총부채/순자산 계산
4. `getAccountFreshnessWarnings(state)`로 stale/failed warning 계산
5. 계좌, 기관, 자산군, 통화, 평가 출처 요약 표시

### mock 계좌 동기화

1. `connectMockProvider`로 mock provider 연결 생성
2. `previewAccountSync`로 provider payload 정규화
3. `recordAccountSyncPreview`로 preview audit/job 기록
4. `applyAccountSyncPreview`로 계좌/자산/부채/link 반영
5. 중복은 hashed external id 또는 alias/type/currency 기반으로 감지

### 순자산 스냅샷

1. `/net-worth` 진입
2. `calculateNetWorth(state)`로 현재 순자산 계산
3. 사용자가 저장하면 `createNetWorthSnapshot(state)`
4. 같은 `referenceMonth`가 있으면 기존 월 snapshot을 대체

### 실거래 리밸런싱 실행 검토

1. 사용자가 리밸런싱 계획을 생성하고 승인
2. `/rebalancing/execute/[planId]` 진입
3. `reviewRealRebalancingExecution`으로 safety check
4. mode 선택
   - `simulation`
   - `sandbox`
   - `manual_real_order`
   - `real_order_api`
5. 실거래 계열은 confirmation text `KIS_REAL_ORDER_EXECUTE` 필요
6. 매도 주문은 별도 확인과 env flag 필요
7. 실행 결과는 `RealRebalancingOrderBatch`와 `RealRebalancingOrderResult`에 저장
8. 실제 API 제출은 env와 broker result bridge가 준비되지 않으면 차단

## 10. 안전 게이트

실거래 주문 차단 조건:

- 중지 스위치 활성
- 승인되지 않은 plan
- active broker connection 없음
- broker order API 미설정
- 투자자 프로필 미완료
- 원금 손실 확인 없음
- 실거래 사용 확인 없음
- 리밸런싱 사용 확인 없음
- 계좌 잔고 stale 또는 failed
- 가격 stale
- 환율 stale
- confirmation text 불일치
- sell order 별도 확인 없음
- `ENABLE_REAL_REBALANCING_EXECUTION=false`
- `ENABLE_REAL_REBALANCING_SELL_ORDERS=false`
- market order
- blocked instrument kind
- leveraged/inverse ETF 자동 실거래

절대 추가하면 안 되는 구현:

- screen scraping
- 은행/증권 비밀번호 저장
- OTP/SMS 우회
- 브라우저 자동화 금융 로그인
- 비공식 reverse-engineered API
- scheduler 또는 background process의 실주문 제출
- LLM 출력 기반 주문 결정
- silent retry

## 11. 환경 변수

`.env.example`에 기준값이 있다. 실제 secret은 `.env.local`에만 둔다.

Phase 6:

```bash
ACCOUNT_AGGREGATION_MODE="mock"
ENABLE_MOCK_BANK_PROVIDER="true"
ENABLE_MOCK_SECURITIES_PROVIDER="true"

ENABLE_OPEN_BANKING_PROVIDER="false"
OPEN_BANKING_CLIENT_ID=""
OPEN_BANKING_CLIENT_SECRET=""
OPEN_BANKING_REDIRECT_URI=""
OPEN_BANKING_ENV="test"

ENABLE_MYDATA_PROVIDER="false"
MYDATA_CLIENT_ID=""
MYDATA_CLIENT_SECRET=""
MYDATA_REDIRECT_URI=""
MYDATA_ENV="test"

ENABLE_REAL_ACCOUNT_SYNC="false"
ENABLE_REAL_REBALANCING_EXECUTION="false"
REAL_REBALANCING_CONFIRMATION_TEXT="KIS_REAL_ORDER_EXECUTE"
ENABLE_REAL_REBALANCING_SELL_ORDERS="false"
```

KIS:

```bash
KIS_ENV="real"
KIS_APP_KEY=""
KIS_APP_SECRET=""
KIS_ACCOUNT_NUMBER=""
KIS_ACCOUNT_PRODUCT_CODE="01"
KIS_ACCOUNT_ALIAS="한국투자증권 종합계좌"
KIS_ALLOW_NON_LOCAL_SERVER_ROUTES="false"
KIS_SYNC_OVERSEAS="false"
KIS_ENABLE_ORDER_API="false"
KIS_ENABLE_REAL_ORDER_API="false"
KIS_ENABLE_SELL_ORDER_API="false"
KIS_ORDER_CONFIRMATION_TEXT="KIS_REAL_ORDER_EXECUTE"
```

## 12. 테스트 현황

테스트 경로:

- `tests/engines`
- `tests/services`
- `tests/phase3`
- `tests/phase4`
- `tests/phase5`
- `tests/phase6`

Phase 6 테스트:

- `tests/phase6/account-aggregation-service.test.ts`
- `tests/phase6/providers.test.ts`
- `tests/phase6/account-sync-service.test.ts`
- `tests/phase6/net-worth-service.test.ts`
- `tests/phase6/real-rebalancing-execution-service.test.ts`

Phase 6 검증 범위:

- 총자산, 총부채, 순자산 계산
- KRW/외화 계좌 평가
- 기관/계좌/자산군 요약
- stale account warning
- failed connection warning
- mock bank/securities payload
- disabled Open Banking/MyData behavior
- KIS normalization mocked response
- secret 미노출
- preview sync no mutation
- apply sync mutation
- duplicate account/holding detection
- sync log creation
- failed sync log creation
- delete synced data
- disconnect provider
- monthly net worth snapshot
- duplicate month replacement
- stale source warning count
- liability inclusion
- real execution default blocked
- stop switch blocked
- stale price/account blocked
- confirmation text blocked
- sell order blocked by default
- proposal creation from approved plan
- simulation/sandbox success
- real execution batch/result 저장
- partial failure 저장
- audit log 생성

## 13. 문서/파일 상태

최근 Phase 6 작업으로 수정/추가된 주요 파일:

- `README.md`
- `HANDOVER.md`
- `.env.example`
- `prisma/schema.prisma`
- `src/lib/types.ts`
- `src/lib/storage/default-state.ts`
- `src/lib/storage/portfolio-storage.ts`
- `src/components/layout/app-shell.tsx`
- `src/components/rebalancing/RebalancingDashboard.tsx`
- `src/components/rebalancing/RebalancingPlanDetail.tsx`
- `src/app/accounts/*`
- `src/app/connections/*`
- `src/app/net-worth/*`
- `src/app/rebalancing/execute/*`
- `src/components/screens/*accounts*`
- `src/components/screens/*connections*`
- `src/components/screens/net-worth-client.tsx`
- `src/components/screens/real-rebalancing-execute-client.tsx`
- `src/lib/services/account-*`
- `src/lib/services/financial-account-service.ts`
- `src/lib/services/institution-connection-service.ts`
- `src/lib/services/manual-account-service.ts`
- `src/lib/services/net-worth-service.ts`
- `src/lib/services/real-rebalancing-execution-service.ts`
- `src/lib/services/providers/*`
- `tests/phase6/*`

## 14. 현재 남은 제한

아직 완료되지 않은 부분:

- DB 기반 영구 저장소 전환
- Prisma migration 생성
- 사용자 인증
- 사용자별 데이터 격리
- 실제 Open Banking/MyData API 호출
- KIS 실주문 API 제출 결과를 Phase 6 batch/result로 연결하는 서버 API bridge
- 실주문 체결 조회
- 주문 정정/취소
- 미체결 주문 관리
- 실제 이메일 발송
- background scheduler 운영
- E2E 테스트
- 모바일/접근성 전체 검증

현재 의도적으로 mock/disabled인 부분:

- mock 은행
- mock 증권
- Open Banking adapter
- MyData adapter
- simulation/sandbox execution

## 15. 다음 권장 작업

1. KIS 실주문 API bridge
   - `/api/broker/kis/order` 결과를 `RealRebalancingOrderBatch`/`RealRebalancingOrderResult`에 연결
   - 부분 실패를 UI에 표시
   - 자동 retry 금지 유지

2. 집계 계좌와 리밸런싱 현재 배분 연결 강화
   - 현재 리밸런싱은 기존 `assets` 중심
   - Phase 6 계좌/linked assets를 current allocation 계산에 안정적으로 반영

3. 서버 저장소 전환 설계
   - `AppState` 컬렉션과 Prisma model mapping
   - migration 생성
   - localStorage에서 DB로 이전 UX

4. 사용자 인증
   - private single-owner mode 유지 여부 결정
   - server mode 전환 시 user_id 적용

5. E2E 테스트
   - `/accounts`
   - `/connections/sync`
   - `/net-worth`
   - `/rebalancing/execute/[planId]`

## 16. 작업 체크리스트

코드 변경 전:

- `git status --short`
- 관련 service와 tests 먼저 읽기
- AppState 변경 여부 확인
- normalize/default 필요 여부 확인

코드 변경 후:

- `npm.cmd test`
- `npm.cmd run build`
- 필요 시 `npm.cmd run prisma:generate`
- dev server에서 주요 route 직접 확인

Phase 6 관련 변경 시:

- raw 계좌번호 저장 여부 확인
- secret이 client state에 들어가지 않는지 확인
- disabled adapter가 실제 데이터를 fake하지 않는지 확인
- 실거래 실행이 기본 차단인지 확인
- confirmation text와 sell flag가 작동하는지 확인
- audit log가 남는지 확인

## 17. 디버깅 메모

PowerShell 출력에서 한글이 깨져 보일 수 있다. 파일 자체가 깨진 것이 아니라 콘솔 인코딩 문제일 수 있으므로 IDE에서 UTF-8로 확인한다.

`npm` 명령이 PowerShell 실행 정책으로 막히면 `npm.cmd`를 사용한다.

Next dev server는 같은 repo에서 중복 실행을 막을 수 있다. 기존 server가 떠 있으면 `http://localhost:3000`을 먼저 확인한다.

localStorage 데이터가 꼬이면 브라우저 devtools에서 `yield-balance-state-v1`를 확인한다.

## 18. 이어받을 때 먼저 볼 파일

다음 작업자가 가장 먼저 읽으면 좋은 파일:

- `README.md`
- `HANDOVER.md`
- `src/lib/types.ts`
- `src/lib/storage/default-state.ts`
- `src/lib/storage/portfolio-storage.ts`
- `src/lib/services/account-aggregation-service.ts`
- `src/lib/services/account-sync-service.ts`
- `src/lib/services/real-rebalancing-execution-service.ts`
- `src/components/screens/accounts-client.tsx`
- `src/components/screens/real-rebalancing-execute-client.tsx`
- `tests/phase6/real-rebalancing-execution-service.test.ts`

기능을 빠르게 확인할 route:

```text
/accounts
/connections
/connections/sync
/net-worth
/rebalancing
/rebalancing/plans/[id]
/rebalancing/execute/[planId]
```

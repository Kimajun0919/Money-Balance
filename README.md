# Yield Balance

Yield Balance는 개인 1인이 직접 사용하는 비공개 투자 및 자산 관리 앱입니다. 목표수익률, 위험 허용도, 보유 자산, 연결 계좌 데이터를 바탕으로 포트폴리오 상태를 계산하고, 계좌 통합 조회, 순자산 계산, 리밸런싱 계획, 주문 제안, 모의 실행, 샌드박스 실행, 제한된 실거래 실행 검토 흐름을 제공합니다.

이 프로젝트는 공개 투자자문 서비스, 제3자 자산관리 서비스, 상업적 금융 서비스 운영을 목적으로 하지 않습니다. 실제 주문 경로는 기본적으로 차단되어 있으며, 명시적 확인과 안전 게이트를 통과해야만 진행할 수 있도록 설계되어 있습니다.

## 구현 범위

현재 구현은 Phase 0부터 Phase 6까지 포함합니다.

- Phase 0/1: 목표수익률 기반 자산군 배분 엔진
- Phase 2: 스냅샷, 월간 리포트, 알림, CSV 가져오기, 월간 배분 계획
- Phase 3: 시장 가격, 환율, 브로커 동기화, mock provider, KIS 잔고 조회
- Phase 4: 개인 거래 보조, 추천, 관심목록, 주문 제안, 거래 안전 게이트, 중지 스위치, 감사 로그
- Phase 5: 자동 리밸런싱 MVP, 드리프트 감지, 현금 우선 계획, 매도 보호, 정책/규칙/스케줄러 no-op, 감사 로그
- Phase 6: 계좌 통합 조회, 연결 센터, 순자산 계산, mock 은행/증권 계좌 동기화, 비활성 Open Banking/MyData 어댑터, 실거래 리밸런싱 실행 검토

데이터는 현재 브라우저 `localStorage`의 `AppState`에 저장됩니다. `prisma/schema.prisma`는 서버 저장소 전환을 위한 기준 모델이며, 현재 로컬 MVP 실행에 PostgreSQL이 필수는 아닙니다.

## 실행 방법

```bash
npm install
npm run dev
```

기본 접속 주소:

```text
http://localhost:3000
```

PowerShell에서 `npm.ps1` 실행 정책 오류가 나면 다음처럼 실행합니다.

```powershell
npm.cmd run dev
npm.cmd test
npm.cmd run build
```

빌드 및 프로덕션 실행:

```bash
npm run build
npm run start
```

Prisma Client 생성:

```bash
npm run prisma:generate
```

Prisma seed:

```bash
npm run prisma:seed
```

## 테스트

```bash
npm test
```

마지막 검증 결과:

- `npm.cmd test`: 33개 테스트 파일, 107개 테스트 통과
- `npm.cmd run build`: 성공

주요 테스트 범위:

- 목표 배분, 기대수익률, 위험 점수, 월간 배분, 리밸런싱 엔진
- 스냅샷, 리포트, 알림, 이메일 mock, CSV 가져오기
- 시장 가격, 환율, 데이터 신선도, 브로커 동기화, KIS read-only 동기화
- 개인 거래 안전 게이트, 주문 제안, 샌드박스/실거래 구조
- Phase 5 리밸런싱 드리프트, 계획, 실행, 스케줄러 no-op
- Phase 6 계좌 집계, provider, 동기화, 순자산 스냅샷, 실거래 리밸런싱 안전 차단

## 주요 화면

### 포트폴리오

- `/dashboard`: 현재 포트폴리오 요약, 위험 점수, 스냅샷 저장
- `/assets`: 수동 자산 등록과 수정
- `/target-portfolio`: 목표 포트폴리오와 현재 비중 비교
- `/rebalance`: 월간 투자금 배분과 수동 리밸런싱 참고
- `/rebalance/history`: 수동 리밸런싱 이력
- `/trends`: 스냅샷 기반 자산/수익률/위험 추이

### 계좌 통합 및 순자산

- `/accounts`: 전체 금융 현황, 총자산, 부채, 순자산, 계좌 목록, 기관별 요약, 자산군 노출, stale warning
- `/accounts/[id]`: 계좌 상세, 연결 자산, 동기화 이력, 경고
- `/net-worth`: 순자산 계산, 월별 순자산 스냅샷 저장

### 연결 및 가져오기

- `/connections`: 연결 센터. KIS, mock 은행, mock 증권, 수동 계좌, CSV, 비활성 Open Banking/MyData 상태 확인
- `/connections/[id]`: 연결 상세와 동기화 작업 이력
- `/connections/sync`: mock 은행/증권 계좌 동기화 미리보기 및 반영
- `/connections/broker`: 기존 브로커 연결. mock 증권/KIS 연결
- `/connections/broker/sync`: 기존 브로커 잔고 동기화 미리보기 및 반영
- `/connections/logs`: 외부 동기화 로그
- `/import/csv`: CSV 가져오기
- `/import/assets`: 자산 가져오기
- `/import/history`: 가져오기 이력

### 거래 및 리밸런싱

- `/trading`: 개인 거래 보조, 추천, 관심목록, 주문 제안, 중지 스위치
- `/rebalancing`: 자동 리밸런싱 대시보드, 드리프트 확인, 계획 생성, 모의 실행
- `/rebalancing/settings`: 리밸런싱 정책과 안전 설정
- `/rebalancing/rules`: 리밸런싱 규칙
- `/rebalancing/plans/[id]`: 계획 상세, 승인/거절, 모의/샌드박스/실거래 제안
- `/rebalancing/execute/[planId]`: Phase 6 실거래 실행 검토. 시뮬레이션, 샌드박스, 수동 실거래 제안, 실거래 API 제출 검토
- `/rebalancing/history`: 리밸런싱 실행 이력
- `/rebalancing/audit`: 리밸런싱 감사 로그

## Phase 6 서비스

Phase 6 서비스는 `src/lib/services`와 `src/lib/services/providers` 아래에 추가되었습니다.

- `account-aggregation-service.ts`: 계좌 대시보드 데이터 구성
- `financial-account-service.ts`: 금융 계좌 생성, 수정, 보관, asset link 관리, 동기화 상태 변경
- `institution-connection-service.ts`: 연결 센터, mock provider 연결, KIS 서버 관리 연결, 비활성 공식 adapter placeholder, 연결 해제, 동기화 데이터 삭제
- `account-sync-service.ts`: 동기화 미리보기, 반영, dry-run, sync job/item 기록, 중복 감지, 실패 기록
- `account-normalization-service.ts`: provider payload를 내부 계좌, 자산, 부채, link로 정규화
- `net-worth-service.ts`: 총자산, 총부채, 순자산, 통화 노출, 자산군 노출, 월별 스냅샷 계산
- `account-valuation-service.ts`: 기존 가격/환율 snapshot 기반 계좌/자산 평가 보조
- `account-freshness-service.ts`: 잔고, 가격, 환율, 연결 실패 경고 생성
- `account-deduplication-service.ts`: 외부 계좌/자산 중복 감지와 해시 생성
- `manual-account-service.ts`: 공식 연결이 불가능한 계좌의 수동 등록
- `account-audit-service.ts`: 연결, 동기화, 수동 계좌, 실거래 리밸런싱 관련 감사 로그
- `real-rebalancing-execution-service.ts`: 승인된 리밸런싱 계획에서 주문 제안 생성, 실행 검토, 시뮬레이션/샌드박스/수동 실거래/실거래 API 결과 저장

Provider 계층:

- `services/providers/account/account-provider.ts`: 공통 금융 데이터 provider interface
- `services/providers/banking/mock-bank-provider.ts`: mock 은행 계좌
- `services/providers/broker/mock-securities-provider.ts`: mock 증권 계좌와 보유상품
- `services/providers/broker/kis-account-provider.ts`: 기존 KIS 브로커 동기화 결과를 계좌 집계 payload로 정규화
- `services/providers/banking/disabled-open-banking-provider.ts`: 비활성 Open Banking adapter
- `services/providers/mydata/disabled-mydata-provider.ts`: 비활성 MyData adapter

## 데이터 모델

`AppState`에 Phase 6 컬렉션이 추가되었습니다.

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

기존 localStorage 사용자를 위해 `src/lib/storage/portfolio-storage.ts`의 normalize 경로가 새 컬렉션의 기본값을 채웁니다.

`prisma/schema.prisma`에도 서버 모드 기준 모델이 추가되었습니다.

- `FinancialInstitution`
- `FinancialAccount`
- `FinancialAccountAssetLink`
- `AccountSyncJob`
- `AccountSyncItem`
- `Liability`
- `NetWorthSnapshot`
- `RealRebalancingOrderBatch`
- `RealRebalancingOrderResult`

## 환경 변수

`.env.example`에 Phase 3/4/5/6 환경 변수가 포함되어 있습니다. 실제 비밀 값은 `.env.local`에만 넣어야 합니다.

기본 mock 계좌 집계:

```bash
ACCOUNT_AGGREGATION_MODE="mock"
ENABLE_MOCK_BANK_PROVIDER="true"
ENABLE_MOCK_SECURITIES_PROVIDER="true"
```

비활성 공식 계좌 집계 provider:

```bash
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
```

실제 계좌 동기화와 실거래 리밸런싱은 기본값으로 꺼져 있습니다.

```bash
ENABLE_REAL_ACCOUNT_SYNC="false"
ENABLE_REAL_REBALANCING_EXECUTION="false"
REAL_REBALANCING_CONFIRMATION_TEXT="KIS_REAL_ORDER_EXECUTE"
ENABLE_REAL_REBALANCING_SELL_ORDERS="false"
```

KIS read-only 잔고 조회는 서버 route에서만 환경 변수를 사용합니다. 브라우저 상태에는 KIS app key, app secret, access token, 원문 계좌번호를 저장하지 않습니다.

```bash
KIS_ENV="real"
KIS_APP_KEY=""
KIS_APP_SECRET=""
KIS_ACCOUNT_NUMBER=""
KIS_ACCOUNT_PRODUCT_CODE="01"
KIS_ACCOUNT_ALIAS="한국투자증권 종합계좌"
KIS_ALLOW_NON_LOCAL_SERVER_ROUTES="false"
KIS_SYNC_OVERSEAS="false"
```

KIS 주문 API는 기본값으로 꺼져 있습니다.

```bash
KIS_ENABLE_ORDER_API="false"
KIS_ENABLE_REAL_ORDER_API="false"
KIS_ENABLE_SELL_ORDER_API="false"
KIS_ORDER_CONFIRMATION_TEXT="KIS_REAL_ORDER_EXECUTE"
```

## 안전 원칙

금지된 구현:

- 은행/증권 사이트 screen scraping
- credential stuffing
- 브라우저 자동화 기반 금융 사이트 로그인
- OTP/SMS 우회
- 은행/증권 계정 비밀번호 저장
- 비공식 reverse-engineered API
- 숨겨진 백그라운드 로그인
- 사용자 동의 없는 자동 금융 앱 조작

실거래 주문 조건:

- 활성 broker 연결
- 신선한 계좌 잔고 데이터
- 신선한 가격 데이터
- 신선한 환율 데이터
- 투자자 프로필 완료
- 거래 위험 게이트 통과
- 리밸런싱 위험 게이트 통과
- 중지 스위치 꺼짐
- 실거래 기능과 실거래 리밸런싱 기능 활성화
- 확인 문구 `KIS_REAL_ORDER_EXECUTE`
- 매도 주문 별도 확인
- 감사 로그 기록

기본 차단:

- 실거래 리밸런싱 API 제출
- 실거래 매도 주문
- 자동 실거래 리밸런싱
- scheduler 기반 실주문
- market order
- margin, short selling, derivative, option, future
- leveraged ETF, inverse ETF 자동 거래
- crypto 자동 거래
- silent retry

## 현재 mock인 것과 실제인 것

Mock 또는 비활성:

- mock 은행 provider
- mock 증권 provider
- Open Banking adapter
- MyData adapter
- 시뮬레이션/샌드박스 리밸런싱 실행

실제 구현:

- localStorage 기반 AppState
- 계좌 통합 조회 계산
- 수동 계좌 추가
- mock provider sync preview/apply
- 순자산 계산과 월별 snapshot
- KIS read-only 동기화 정규화 브리지
- 실거래 리밸런싱 안전 검토와 결과 저장 구조
- 감사 로그

아직 추가로 필요한 실제 연동:

- Open Banking/MyData 공식 자격 증명 기반 API 호출
- KIS 실주문 API 제출 결과를 Phase 6 batch/result에 직접 연결하는 서버 API bridge
- 실주문 체결 조회, 정정/취소, 미체결 주문 관리
- DB migration과 서버 저장소 전환
- 사용자 인증과 사용자별 데이터 분리

## 개발 시 주의점

- `AppState` 필드를 추가하면 반드시 `default-state.ts`와 `portfolio-storage.ts` normalize 경로를 함께 수정합니다.
- 실제 secret은 client component나 localStorage에 넣지 않습니다.
- 외부 계좌번호는 원문 저장하지 않고 hash 또는 masked 값만 사용합니다.
- 리밸런싱/주문 결정은 LLM이 아니라 deterministic service와 engine이 수행해야 합니다.
- 실제 주문은 추천, LLM 출력, scheduler, background process에서 직접 제출하지 않습니다.
- 문구를 바꿀 때는 금융 자문처럼 보이는 표현을 피하고, 사용자가 직접 확인해야 한다는 흐름을 유지합니다.

## 다음 권장 작업

1. KIS 실주문 API route와 `RealRebalancingOrderBatch`/`RealRebalancingOrderResult` 저장 흐름 연결
2. 계좌 통합 데이터를 기존 리밸런싱 현재 배분 계산에 더 깊게 연결
3. Prisma migration 생성과 서버 저장소 전환 설계
4. 사용자 인증과 데이터 분리
5. Playwright 기반 주요 화면 회귀 테스트

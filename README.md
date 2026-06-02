# Yield Balance

Yield Balance는 사용자가 입력한 목표수익률, 위험허용도, 최소 현금성 자산 비중, 보유 자산 정보를 기준으로 자산군 단위 목표배분과 월간 관리 흐름을 제공하는 내부 MVP입니다.

현재 구현은 Phase 0/1 계산기, Phase 2 관리형 MVP, Phase 3 실제 데이터 연동 MVP, Phase 4 개인용 거래 보조 MVP, Phase 5 자동 리밸런싱 MVP를 포함합니다. 앱 데이터는 브라우저 로컬 저장소에 저장되며, Prisma 스키마는 서버 저장 전환을 위한 기준 모델로 유지합니다.

## 실행 방법

```bash
npm install
npm run dev
```

접속 주소: `http://localhost:3000`

빌드 확인:

```bash
npm run build
npm run start
```

Prisma Client 생성:

```bash
npm run prisma:generate
```

PostgreSQL 연결 후 시드 실행:

```bash
npm run prisma:seed
```

## 테스트 방법

```bash
npm test
```

현재 테스트는 엔진과 Phase 2 서비스 계층을 함께 검증합니다.

- 목표배분 밴드 매핑과 제한 조건
- 포트폴리오 기대수익률, 세후 참고 수익률, 총수익률
- 위험점수 구성 요소
- 자산군별 조정 참고 금액과 상태 우선순위
- 월 신규 투자금 배분
- 월간 스냅샷 생성, 중복 감지, 교체 시 보관 처리
- 월간 리포트 비교와 한국어 요약
- 배분 계획 저장과 상태 변경
- 리밸런싱 이력 필터와 상태 변경
- 스냅샷 기반 추이 데이터
- 알림 생성과 읽음 처리
- 이메일 mock 로그
- CSV 검증, 중복 감지, 자산 생성
- 모의 시세와 환율 공급자
- 수량, 현재가, 환율 기반 평가금액 갱신
- 데이터 신선도 경고
- 자산군 자동 분류 제안
- 증권사 읽기 전용 모의 연결, 한국투자증권 KIS 잔고 조회, 동기화 미리보기와 반영
- 개인용 안전 게이트, 종목 추천, 관심목록, 주문 제안, 모의/샌드박스/실거래 구조, 자동매매 규칙, 중지 스위치, 거래 감사 로그
- 리밸런싱 드리프트 계산, 현금 우선 계획 생성, 매도 보호, 모의/샌드박스/실거래 리밸런싱 구조, 자동 규칙, 스케줄러 no-op, 리밸런싱 감사 로그

## 내부 비율 규칙

코드 내부의 수익률과 비중은 모두 소수로 저장합니다.

- 10%는 `0.10`
- 8.3%는 `0.083`
- 화면 표시 시에만 퍼센트 형식으로 변환합니다.

## 주요 화면

- `/onboarding`: 목표수익률, 위험허용도, 손실 허용폭, 최소 현금성 자산 비중 입력
- `/assets`: 수동 자산 등록과 원화 환산
- `/dashboard`: 현재 포트폴리오 요약, 위험점수, 고분배 착시, 스냅샷 저장
- `/snapshots`: 월간 스냅샷 목록, 생성, 중복 월 교체, 보관 처리
- `/snapshots/[id]`: 스냅샷 상세와 자산군별 항목
- `/reports`: 월간 리포트 목록과 이메일 mock 생성
- `/reports/[id]`: 현재 스냅샷과 이전 스냅샷 비교
- `/target-portfolio`: 목표배분과 현재비중 비교
- `/rebalance`: 월 신규 투자금 배분, 배분 계획 저장, 조정 참고 금액
- `/rebalance/history`: 리밸런싱 제안 이력, 필터, 상태 변경
- `/trends`: 스냅샷 기반 총자산, 위험점수, 수익률, 현금성 비중, 자산군 비중 추이
- `/notifications`: 서비스 내 알림 목록과 읽음 처리
- `/settings/notifications`: 서비스 내 알림, 이메일, 위험/목표 괴리/고분배 착시 알림 설정
- `/settings/data-sources`: 모의 시세와 환율 새로고침, 데이터 기준 시각과 신선도 경고
- `/import/csv`: 표준 CSV 템플릿 다운로드, 검증, 가져오기, 가져오기 이력
- `/import/assets`: Phase 3 자산 가져오기 화면
- `/import/history`: 가져오기 작업 이력과 연결 스냅샷 확인
- `/connections/broker`: 읽기 전용 모의 증권사/한국투자증권 KIS 연결, 연동 해제, 동기화 데이터 삭제
- `/connections/broker/sync`: 증권사 잔고 동기화 미리보기와 사용자 확인 후 반영
- `/connections/logs`: 외부 데이터 연동 로그 확인
- `/trading`: 개인용 추천, 상품 유니버스, 관심목록, 주문 제안, 자동매매 규칙, 중지 스위치
- `/rebalancing`: 현재비중과 목표비중 비교, 드리프트 요약, 계획 생성, 모의 실행
- `/rebalancing/settings`: 리밸런싱 정책, 기준값, 매도 허용, 실거래/자동 확인, 중지 스위치
- `/rebalancing/plans/[id]`: 계획 상세, 주문 항목, 승인/거절, 모의/샌드박스/실거래 제안
- `/rebalancing/rules`: 자동 리밸런싱 규칙 생성, 활성화, 수동 점검
- `/rebalancing/history`: 스냅샷, 계획, 실행, 스케줄러 no-op 이력
- `/rebalancing/audit`: 리밸런싱 감사 로그와 안전 플래그 스냅샷

## Phase 2 서비스 계층

서비스는 UI와 분리되어 `src/lib/services`에 있습니다.

- `snapshot-service.ts`: 월간 스냅샷 생성, 중복 월 정책, 교체 시 보관 처리, 리포트/알림 연계
- `report-service.ts`: 현재 스냅샷과 이전 비보관 스냅샷 비교, 변화값 계산, 한국어 요약 생성
- `monthly-allocation-plan-service.ts`: 월 신규 투자금 배분 결과 저장과 상태 변경
- `rebalance-history-service.ts`: 리밸런싱 제안 필터와 상태 변경
- `trend-service.ts`: 스냅샷 기반 차트 데이터 생성과 기간 필터
- `notification-service.ts`: 서비스 내 알림 생성, 읽음 처리, 알림 설정 반영
- `email-service.ts`: 이메일 템플릿 렌더링과 mock 로그 저장
- `csv-import-service.ts`: CSV 파싱, 검증, 중복 감지, 자산 생성, 가져오기 이력 저장

## Phase 3 서비스 계층

Phase 3은 외부 데이터를 기존 계산 엔진 앞단에서 정규화한 뒤 자산 테이블에 반영합니다. 현재 실제 API 키 없이 동작하도록 모의 공급자를 기본값으로 사용합니다.

- `providers/market-data`: 시세 공급자 인터페이스, 모의 시세 공급자, 실제 공급자 교체용 비활성 어댑터
- `providers/fx-rate`: 환율 공급자 인터페이스, 모의 환율 공급자, 실제 공급자 교체용 비활성 어댑터
- `providers/broker`: 읽기 전용 증권사 공급자 인터페이스, 모의 증권사 공급자, 한국투자증권 KIS 잔고 조회 어댑터
- `market-data-service.ts`: 종목코드와 수량이 있는 자산의 현재가, 과거가격, 가격 변화율 갱신
- `fx-rate-service.ts`: 외화 자산의 환율 갱신과 원화 환산 금액 업데이트
- `valuation-service.ts`: 수량 × 현재가 × 환율 기반 평가금액 갱신, 수동 평가금액 보존
- `data-freshness-service.ts`: 시세/환율 24시간, 증권사 잔고 7일 기준 경고 생성
- `asset-classification-service.ts`: 이름, 티커, 상품 유형 기반 자산군 제안과 신뢰도 산출
- `asset-normalization-service.ts`: 증권사 잔고와 현금 데이터를 내부 자산 입력 형식으로 변환
- `broker-connection-service.ts`: 읽기 전용 연결 동의, 모의 토큰 암호화 저장, 서버관리형 KIS 연결 저장, 연동 해제, 동기화 데이터 삭제
- `broker-sync-service.ts`: 모의/KIS 동기화 미리보기, 중복 감지, 사용자 확인 후 반영, 스냅샷 생성
- `token-encryption-service.ts`: 브라우저 Web Crypto 기반 AES-GCM 토큰 암호화

## Phase 4 서비스 계층

Phase 4는 공개 투자자문 서비스가 아니라 소유자 1인이 직접 사용하는 개인용 거래 보조 구조입니다. 법무 검토, 투자자문업 등록, 공공 서비스 출시 승인, 상업적 컴플라이언스 승인 여부는 개발 차단 조건으로 사용하지 않습니다.

대신 실거래 또는 자동매매가 실제 계좌와 연결될 수 있다는 점을 기준으로 개인 안전 게이트를 둡니다.

- `safety/private-trading-gate.ts`: 개인 사용 모드, 사용자 확인, 위험 확인, 브로커 연결, 중지 스위치 조건 평가
- `recommendation-service.ts`: 목표비중 차이와 상품 유니버스를 기준으로 하는 규칙 기반 종목 추천
- `watchlist-service.ts`: 추천 기반 관심목록 저장
- `order-proposal-service.ts`: 주문 제안 생성, 사용자 확인, 모의/샌드박스/실거래 제출 구조, 주문 이벤트 로그
- `trade-risk-service.ts`: 1회/일/월 주문 한도, 주문 횟수, 현금성 비중, 위험점수, 차단 상품, 오래된 가격 기준 점검
- `broker-sandbox-trading-service.ts`: 주문 API 샌드박스 연결 상태와 샌드박스 주문 제출 인터페이스
- `auto-trading-service.ts`: 비활성 기본값의 자동매매 규칙 생성, 활성화, 실행 차단/기록
- `trading-profile-service.ts`: 투자자 프로필, 원금 손실 확인, 실거래/자동매매 확인, 중지 스위치
- `trading-audit-service.ts`: 추천, 주문, 자동매매, 중지 스위치 감사 로그 저장

추천 엔진은 LLM 출력을 최종 의사결정에 사용하지 않습니다. LLM을 붙이더라도 결과 설명 문장 생성에만 사용할 수 있고, 주문 실행 판단은 규칙 기반 서비스가 담당해야 합니다.

## Phase 5 서비스 계층

Phase 5는 개인용 자동 리밸런싱 계층입니다. 현재 포트폴리오와 목표비중을 비교하고, 드리프트를 감지하고, 현금 우선 리밸런싱 계획을 생성한 뒤 모의/샌드박스/실거래 주문 제안으로 연결합니다.

- `rebalancing-drift-engine.ts`: 현재비중, 목표비중, 자산군/상품 드리프트, 최대 드리프트, 필요 여부 계산
- `rebalancing-plan-engine.ts`: 현금 우선 계획 생성, 매도 보호, 주문 항목, 예상 현금/위험 계산
- `rebalancing-risk-engine.ts`: 현금비중, 주문 한도, 총액 한도, 주문 횟수, 오래된 가격, 위험점수, 대기 시간, 중지 스위치 점검
- `rebalancing-execution-engine.ts`: 실행 모드 표시와 중지 스위치 확인 헬퍼
- `rebalancing-plan-service.ts`: 스냅샷/계획/항목 저장, 승인/거절, 이벤트/감사 로그
- `rebalancing-execution-service.ts`: 모의 리밸런싱, 샌드박스 리밸런싱, 실거래 주문 제안, 자동 실거래 차단 구조
- `rebalancing-rule-service.ts`: 정책 변경, 규칙 생성/활성화, 리밸런싱 사용자 확인
- `rebalancing-scheduler-service.ts`: 규칙 점검, 드리프트/현금 트리거, cooldown, no-op 기록
- `rebalancing-audit-service.ts`: 리밸런싱 이벤트와 감사 로그 저장
- `rebalancing-service.ts`: 대시보드 데이터와 수동 점검 진입점

실거래 리밸런싱은 주문 제안까지만 만들고, 실제 주문 제출은 사용자 확인과 기존 거래 안전 게이트를 통과해야 합니다. 실거래 자동 리밸런싱은 구조만 있으며 기본값에서 차단됩니다.

## 추가 DB 모델

`prisma/schema.prisma`에 Phase 2 모델을 추가했습니다.

- `PortfolioSnapshot`: `reference_portfolio_expected_return`, `snapshot_source`, `is_archived`, `replaced_by_snapshot_id`
- `PortfolioSnapshotItem`: `min_ratio`, `max_ratio`, `allocation_gap_status`
- `MonthlyReport`
- `MonthlyAllocationPlan`
- `Notification`
- `EmailLog`
- `UserNotificationSetting`
- `CsvImportJob`
- `CsvImportRow`

Phase 3 기준 모델:

- `MarketPriceSnapshot`: 조회된 시세, 기준일, 공급자, 지연 여부, 원천 응답
- `FxRateSnapshot`: 조회된 환율, 기준일, 공급자, 추정 여부, 원천 응답
- `AssetPriceLink`: 자산과 시세/환율 공급자 연결 설정
- `ExternalConnection`: 외부 공급자 연결, 암호화 토큰, 읽기 전용 권한, 상태
- `ExternalSyncLog`: 시세, 환율, CSV, 증권사 동기화 작업 로그
- `ExternalAssetMapping`: 외부 자산 식별자와 내부 자산군 매핑
- `Asset` 확장 필드: `ticker`, `market`, `broker_name`, `account_alias`, `valuation_source`, `price_source`, `fx_source`, `last_synced_at`, `last_price_updated_at`, `last_fx_updated_at`

Phase 4 기준 모델:

- `UserPrivateTradingSetting`: 개인용 거래 플래그와 위험 한도
- `InvestorProfile`: 개인 투자자 프로필과 적합성 확인 상태
- `ProductUniverseItem`: 개인 상품 유니버스와 상품별 자동매매 허용 상태
- `InstrumentRecommendation`: 규칙 기반 추천 기록과 안전 플래그 스냅샷
- `WatchlistItem`: 개인 관심목록
- `TradingOrderProposal`: 주문 제안, 확인, 제출 상태
- `OrderEventLog`: 주문 제안과 제출 이벤트
- `TradingAuditLog`: 추천, 주문, 자동매매, 중지 스위치 감사 로그
- `TradingAcknowledgement`: 원금 손실, 실거래, 자동매매 확인 기록
- `AutoTradingRule`: 비활성 기본값의 자동매매 규칙

Phase 5 기준 모델:

- `RebalancingPolicy`: 기준 드리프트, 거래 한도, 현금 우선, 매도 허용, 확인 조건
- `RebalancingRule`: 스케줄/임계값/현금 트리거, 대상/제외 자산군, cooldown, 수동 검토
- `RebalancingSnapshot`: 리밸런싱 분석 시점의 현재비중, 목표비중, 드리프트, 위험점수
- `RebalancingPlan`: 계획 상태, 예상 거래액, 수수료, 현금비중, 위험점수, 경고와 차단 사유
- `RebalancingPlanItem`: 자산군별 매수/매도/유지 제안, 금액, 수량, 위험 경고
- `RebalancingExecution`: 모의/샌드박스/수동 실거래/자동 실거래 실행 기록
- `RebalancingEvent`: 계획 생성, no-op, 실행, 차단, 실패 이벤트
- `RebalancingAuditLog`: 리밸런싱 판단 입력/출력, 안전 플래그, 위험 점검, 사용자 확인 스냅샷
- `RebalancingSchedulerRun`: 스케줄러 점검, no-op, 차단, 실패 이력
- `RebalancingUserAcknowledgement`: 수동/자동/매도/대형/실거래 리밸런싱 확인 기록

아직 Prisma migration 파일은 생성하지 않았습니다. 실제 DB 전환 시 사용자 계정, 권한 확인, 기존 localStorage 데이터 이전 UX를 함께 설계해야 합니다.

## 환경 변수

`.env.example`을 기준으로 환경 변수를 준비합니다. 현재 Phase 3은 모의 공급자를 기본으로 사용하므로 실제 API 키가 없어도 동작합니다.

```bash
cp .env.example .env
```

한국투자증권 KIS 읽기 전용 잔고 조회를 사용하려면 `.env.local`에 아래 값을 설정합니다. 키는 브라우저에 입력하지 않고 서버 route에서만 사용합니다.

```bash
KIS_ENV="real"
KIS_APP_KEY="..."
KIS_APP_SECRET="..."
KIS_ACCOUNT_NUMBER="12345678"
KIS_ACCOUNT_PRODUCT_CODE="01"
KIS_ACCOUNT_ALIAS="한국투자 종합계좌"
KIS_ALLOW_NON_LOCAL_SERVER_ROUTES="false"
```

KIS 서버 route는 기본값에서 `localhost`, `127.0.0.1`, `::1` 요청만 허용합니다. 공개 배포에서 이 route를 열면 서버 환경변수의 실계좌 잔고가 API 응답으로 노출될 수 있으므로, 사용자 인증과 권한 분리를 붙이기 전에는 `KIS_ALLOW_NON_LOCAL_SERVER_ROUTES`를 켜지 않습니다.

해외주식 잔고는 계좌 권한과 거래소 파라미터가 맞아야 하므로 기본값에서는 꺼져 있습니다. 필요하면 `KIS_SYNC_OVERSEAS="true"`, `KIS_OVERSEAS_EXCHANGES="NASD"`, `KIS_OVERSEAS_CURRENCIES="USD"`를 설정합니다. KIS 해외 잔고 응답에 환율이 없으면 `KIS_DEFAULT_USD_KRW_RATE`를 설정하거나 동기화 미리보기에서 환율 경고를 확인해야 합니다.

현재 KIS 구현은 잔고/예수금 조회 전용입니다. 주문, 정정, 취소 API는 연결하지 않았습니다. 실제 주문 기능을 붙이기 전에는 사용자별 권한 검증, 주문 확인 기록, 주문 감사 로그, 중지 스위치 동작을 먼저 확정해야 합니다.

## 이메일 mock

이메일 제공자가 설정되지 않은 상태를 기본으로 보고 mock 방식으로 처리합니다.

- 이메일 설정이 꺼져 있으면 `skipped` 로그를 저장합니다.
- 이메일 설정이 켜져 있으면 실제 발송 대신 `mock_sent` 로그를 저장합니다.
- 모든 이메일 본문은 한국어이며 필수 고지를 포함합니다.

## CSV 가져오기

표준 템플릿 파일명은 `yield_balance_asset_template.csv`입니다.

주요 검증:

- `asset_type`은 공식 자산군 코드와 일치해야 합니다.
- `account_type`은 공식 계좌 유형 코드와 일치해야 합니다.
- 외화 자산은 `exchange_rate`가 필요합니다.
- 가격 변화율이 입력되면 `price_change_period_type`이 필요합니다.
- 수익률, 세율, 금액 범위는 수동 자산 입력 검증 정책을 따릅니다.
- 기존 자산과 이름, 자산군, 계좌 유형, 매입일, 매입금액이 같으면 중복 경고를 표시합니다.

## 개인용 거래 안전 원칙

이 프로젝트는 공개 출시, 상업적 배포, 제3자 투자자문 서비스, 규제 금융서비스 운영을 목적으로 하지 않습니다. 법무 검토, 인허가, 투자자문업 등록, 공공 서비스 컴플라이언스 승인, 상업적 브로커 제휴 승인은 Phase 4 개발 게이트가 아닙니다.

기본값:

- 종목 추천: 투자자 프로필과 원금 손실 확인 후 허용
- 모의투자: 켜짐
- 브로커 샌드박스: 연결 상태가 있으면 허용
- 실거래: 꺼짐
- 자동매매: 꺼짐
- 상품별 자동매매: 꺼짐
- 리밸런싱 분석: 켜짐
- 모의 리밸런싱: 켜짐
- 샌드박스 리밸런싱: 주문 API 연결 상태가 있으면 허용
- 실거래 리밸런싱: 꺼짐
- 자동 리밸런싱: 꺼짐
- 중지 스위치: 켜지는 즉시 실거래, 자동매매, 실거래 리밸런싱, 자동 리밸런싱 차단

계속 차단하는 항목:

- 마진 거래, 공매도, 파생상품, 옵션, 선물
- 레버리지 ETF 자동매매, 가상자산 자동매매, 비유동 자산 자동매매
- 숨겨진 주문 실행, 시세조종, 가장매매, 스푸핑, 레이어링
- 과도한 주문 빈도
- LLM 출력만으로 실행되는 자동매매
- 감사 로그, 위험 한도, 중지 스위치 없는 거래 또는 리밸런싱

본 기능은 개인이 직접 사용하는 비공개 투자 관리 도구입니다. 표시되는 추천, 주문 제안, 리밸런싱 정보, 모의투자 및 자동매매 결과는 사용자가 입력하거나 연결한 정보와 사전에 정한 규칙에 따른 참고 결과입니다. 투자 수익을 보장하지 않으며 원금 손실 가능성이 있습니다. 실제 주문 실행 여부와 최종 책임은 사용자 본인에게 있습니다.

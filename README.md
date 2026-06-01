# Yield Balance

Yield Balance는 사용자가 입력한 목표수익률, 위험허용도, 최소 현금성 자산 비중, 보유 자산 정보를 기준으로 자산군 단위 목표배분과 월간 관리 흐름을 제공하는 내부 MVP입니다.

현재 구현은 Phase 0/1 계산기, Phase 2 관리형 MVP, Phase 3 실제 데이터 연동 MVP를 포함합니다. 앱 데이터는 브라우저 로컬 저장소에 저장되며, Prisma 스키마는 서버 저장 전환을 위한 기준 모델로 유지합니다.

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
- 증권사 읽기 전용 모의 연결, 토큰 암호화, 동기화 미리보기와 반영

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
- `/connections/broker`: 읽기 전용 모의 증권사 연결, 연동 해제, 동기화 데이터 삭제
- `/connections/broker/sync`: 증권사 잔고 동기화 미리보기와 사용자 확인 후 반영
- `/connections/logs`: 외부 데이터 연동 로그 확인

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
- `providers/broker`: 읽기 전용 증권사 공급자 인터페이스, 모의 증권사 공급자, 실제 공급자 교체용 비활성 어댑터
- `market-data-service.ts`: 종목코드와 수량이 있는 자산의 현재가, 과거가격, 가격 변화율 갱신
- `fx-rate-service.ts`: 외화 자산의 환율 갱신과 원화 환산 금액 업데이트
- `valuation-service.ts`: 수량 × 현재가 × 환율 기반 평가금액 갱신, 수동 평가금액 보존
- `data-freshness-service.ts`: 시세/환율 24시간, 증권사 잔고 7일 기준 경고 생성
- `asset-classification-service.ts`: 이름, 티커, 상품 유형 기반 자산군 제안과 신뢰도 산출
- `asset-normalization-service.ts`: 증권사 잔고와 현금 데이터를 내부 자산 입력 형식으로 변환
- `broker-connection-service.ts`: 읽기 전용 연결 동의, 토큰 암호화 저장, 연동 해제, 동기화 데이터 삭제
- `broker-sync-service.ts`: 동기화 미리보기, 중복 감지, 사용자 확인 후 반영, 스냅샷 생성
- `token-encryption-service.ts`: 브라우저 Web Crypto 기반 AES-GCM 토큰 암호화

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

아직 Prisma migration 파일은 생성하지 않았습니다. 실제 DB 전환 시 사용자 계정, 권한 확인, 기존 localStorage 데이터 이전 UX를 함께 설계해야 합니다.

## 환경 변수

`.env.example`을 기준으로 환경 변수를 준비합니다. 현재 Phase 3은 모의 공급자를 기본으로 사용하므로 실제 API 키가 없어도 동작합니다.

```bash
cp .env.example .env
```

실제 시세, 환율, 증권사 API를 붙이기 전에는 서버 측 토큰 암호화 키, 사용자별 권한 검증, 수신 동의와 로그 보관 정책을 먼저 확정해야 합니다.

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

## 법무 검토 전 제한

외부 공개 전에는 법무 검토가 필요합니다. 현재 구현은 내부 계산과 자산군 단위 참고 정보 제공에 한정합니다.

구현하지 않은 항목:

- 자동매매
- 특정 종목, 펀드, 채권, 금융상품 단위 추천
- 상품 단위 매수·매도 지시
- 성과를 단정하는 표현
- 레버리지 또는 파생전략
- 실제 증권사 API, MyData, 실제 시세/환율 API 연동
- 주문 API, 주문 취소 API, 자동매매, 특정 상품 단위 추천
- 법률·세무 판단으로 해석될 수 있는 계산 확정

본 서비스는 투자 수익률을 보장하지 않으며, 특정 금융상품의 매수·매도 지시나 자동매매를 제공하지 않습니다. 표시되는 수익률과 리밸런싱 정보는 사용자가 입력한 정보와 자산군 기준 가정에 따른 참고 계산 결과이며, 실제 투자 판단과 책임은 사용자 본인에게 있습니다.

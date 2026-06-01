# Yield Balance

Yield Balance는 사용자가 입력한 목표수익률, 위험허용도, 최소 현금성 자산 비중, 보유 자산 정보를 기준으로 자산군 단위 목표배분과 월간 관리 흐름을 제공하는 내부 MVP입니다.

현재 구현은 Phase 0/1 계산기와 Phase 2 관리형 MVP를 포함합니다. 앱 데이터는 브라우저 로컬 저장소에 저장되며, Prisma 스키마는 서버 저장 전환을 위한 기준 모델로 유지합니다.

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
- `/import/csv`: 표준 CSV 템플릿 다운로드, 검증, 가져오기, 가져오기 이력

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
- 증권사 API, MyData, 자동 시장가격/환율 연동
- 법률·세무 판단으로 해석될 수 있는 계산 확정

본 서비스는 투자 수익률을 보장하지 않으며, 특정 금융상품의 매수·매도 지시나 자동매매를 제공하지 않습니다. 표시되는 수익률과 리밸런싱 정보는 사용자가 입력한 정보와 자산군 기준 가정에 따른 참고 계산 결과이며, 실제 투자 판단과 책임은 사용자 본인에게 있습니다.

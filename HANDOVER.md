# Yield Balance 핸드오버

작성일: 2026-06-01  
프로젝트 경로: `d:\test\Money-Balance`  
현재 앱 성격: 자산군 비중 기반 포트폴리오 점검, 월간 스냅샷, 리밸런싱 계획, 리포트, 추세, 알림, CSV 가져오기를 제공하는 Next.js 로컬 앱

## 1. 핵심 요약

Yield Balance는 개별 상품 추천 앱이 아니라 사용자가 직접 입력한 자산군, 목표 비중, 기대수익률, 평가금액을 기반으로 현재 포트폴리오 상태를 계산하고 기록하는 도구다.

현재 구현은 Phase 0/1 기능 위에 Phase 2 기능이 올라간 상태다. UI는 Next.js App Router 기반이고, 실제 런타임 데이터는 브라우저 `localStorage`의 `AppState`에 저장된다. Prisma 스키마는 확장되어 있으나 현재 화면/서비스는 DB가 아니라 로컬 스토리지 상태를 사용한다.

현재 구현된 주요 범위는 다음과 같다.

- 온보딩/자산 입력 후 대시보드에서 현재 포트폴리오 점검
- 월간 포트폴리오 스냅샷 생성, 중복 월 처리, 교체 시 이전 스냅샷 보관
- 스냅샷 기반 월간 리포트 생성 및 상세 보기
- 리밸런싱 계획 저장 및 이력 관리
- 스냅샷 기반 자산군 비중/수익률 추세 차트
- 앱 내 알림 및 알림 설정
- 이메일 발송 로그와 템플릿 기반 목업 처리
- CSV 템플릿 다운로드, 미리보기, 검증, 가져오기
- 서비스 단위 테스트와 빌드 검증

## 2. 빠른 시작

```powershell
npm install
npm run prisma:generate
npm run dev
```

개발 서버는 기본적으로 다음 주소에서 확인한다.

```text
http://127.0.0.1:3000
```

검증 명령은 다음 순서로 실행하면 된다.

```powershell
npm test
npm run build
npm run prisma:generate
npm audit
```

마지막 확인 결과는 다음과 같았다.

- `npm test`: 13개 테스트 파일, 44개 테스트 통과
- `npm run build`: 성공
- `npm run prisma:generate`: 성공
- `npm audit`: 취약점 0개
- 개발 서버 `http://127.0.0.1:3000`: HTTP 200 확인

문서만 수정한 뒤에는 전체 테스트를 다시 돌릴 필요는 낮지만, 기능 코드를 건드리면 위 명령을 다시 실행해야 한다.

## 3. 기술 스택

- Next.js App Router
- React
- TypeScript
- Tailwind CSS
- Recharts
- Prisma
- Vitest
- localStorage 기반 클라이언트 상태 저장

`package.json`에서 주요 스크립트는 다음과 같다.

- `npm run dev`: 개발 서버 실행
- `npm run build`: 프로덕션 빌드
- `npm run start`: 빌드 결과 실행
- `npm test`: Vitest 실행
- `npm run test:watch`: Vitest watch 모드
- `npm run prisma:generate`: Prisma Client 생성
- `npm run prisma:seed`: Prisma seed 실행

`package.json`에는 보안 점검 대응으로 `postcss` override가 있다.

```json
"overrides": {
  "postcss": "8.5.15"
}
```

## 4. 저장소 구조

중요한 경로만 정리한다.

```text
prisma/
  schema.prisma

src/app/
  page.tsx
  dashboard/
  rebalance/
  rebalance/history/
  snapshots/
  snapshots/[id]/
  reports/
  reports/[id]/
  trends/
  notifications/
  settings/notifications/
  import/csv/

src/components/
  common/
  layout/
  screens/

src/lib/
  constants/
  emails/
  engines/
  kpi/
  services/
  storage/
  utils/
  types.ts

tests/
  services/
```

## 5. 앱 아키텍처

### 5.1 화면 계층

`src/app` 아래의 라우트는 대부분 서버 컴포넌트 껍데기 역할을 하고, 실제 상호작용은 `src/components/screens/*-client.tsx` 클라이언트 컴포넌트에서 처리한다.

주요 화면은 다음과 같다.

- `/`: 시작/온보딩 진입
- `/dashboard`: 현재 자산군 비중, 기대수익률, 상태 점검, 월간 스냅샷 생성
- `/rebalance`: 목표 비중과 현재 비중 차이에 따른 리밸런싱 계획 저장
- `/rebalance/history`: 저장된 리밸런싱 제안 이력 관리
- `/snapshots`: 월간 스냅샷 목록
- `/snapshots/[id]`: 스냅샷 상세
- `/reports`: 월간 리포트 목록
- `/reports/[id]`: 리포트 상세
- `/trends`: 스냅샷 기반 추세 차트
- `/notifications`: 앱 내 알림 목록
- `/settings/notifications`: 알림 채널/유형 설정
- `/import/csv`: CSV 템플릿, 미리보기, 검증, 가져오기

공통 레이아웃/내비게이션은 `src/components/layout/app-shell.tsx`에 있다.

### 5.2 상태 저장 계층

현재 런타임 데이터는 `src/lib/storage/portfolio-storage.ts`에서 관리한다.

핵심 역할은 다음과 같다.

- 브라우저 `localStorage`에서 `AppState` 읽기
- 저장된 이전 형태의 상태를 최신 구조로 보정
- 기본 상태와 누락 필드를 병합
- 상태 저장/초기화 유틸 제공

기본 상태는 `src/lib/storage/default-state.ts`에 있다.

주의할 점:

- 서버 DB에 저장하지 않는다.
- 브라우저/기기/프로필이 바뀌면 데이터도 분리된다.
- private browsing 또는 localStorage 삭제 시 데이터가 사라진다.
- Prisma schema는 앞으로 서버 저장소로 옮기기 위한 구조에 가깝다.

### 5.3 계산 엔진

기존 핵심 계산은 `src/lib/engines/return-calculation-engine.ts`에 있다.

주요 책임은 다음과 같다.

- 자산군별 현재 평가금액 합산
- 현재 비중 계산
- 목표 비중과 현재 비중 차이 계산
- 포트폴리오 기대수익률 계산
- 상태별 메시지/표시값 산출

계산 로직 변경 시 대시보드, 리밸런싱, 스냅샷, 리포트, 추세가 같이 영향을 받는다. 이 파일을 바꾸면 서비스 테스트 외에 관련 화면도 직접 확인해야 한다.

### 5.4 서비스 계층

Phase 2 기능은 `src/lib/services`에 모여 있다.

```text
src/lib/services/
  csv-import-service.ts
  email-service.ts
  monthly-allocation-plan-service.ts
  notification-service.ts
  rebalance-history-service.ts
  report-service.ts
  service-utils.ts
  snapshot-service.ts
  trend-service.ts
```

서비스 계층은 순수 함수에 가깝게 설계되어 있으며, 대부분 `AppState`를 받아 새 `AppState` 또는 파생 데이터를 반환한다. 화면 컴포넌트가 직접 복잡한 도메인 로직을 갖지 않도록 분리했다.

## 6. 타입과 데이터 모델

핵심 타입은 `src/lib/types.ts`에 있다.

Phase 2에서 추가된 주요 enum/union 성격 타입은 다음과 같다.

- `SnapshotSource`
- `DuplicateSnapshotPolicy`
- `AllocationGapStatus`
- `SuggestionStatus`
- `NotificationType`
- `NotificationPriority`
- `EmailType`
- `EmailStatus`
- `PeriodFilter`
- `CsvImportStatus`
- `CsvRowValidationStatus`

Phase 2에서 추가된 주요 데이터 타입은 다음과 같다.

- `SnapshotItem`
- `MonthlyReport`
- `MonthlyReportDetail`
- `MonthlyAllocationPlan`
- `RebalanceSuggestionRecord`
- `Notification`
- `EmailLog`
- `UserNotificationSettings`
- `CsvImportJob`
- `CsvImportRow`

`AppState`에는 기존 포트폴리오 설정/자산 정보에 더해 다음 컬렉션이 포함된다.

- `snapshots`
- `monthlyReports`
- `monthlyAllocationPlans`
- `rebalanceSuggestions`
- `notifications`
- `emailLogs`
- `notificationSettings`
- `csvImportJobs`
- `csvImportRows`

상태 확장 시 반드시 다음 두 파일을 같이 확인해야 한다.

- `src/lib/types.ts`
- `src/lib/storage/default-state.ts`
- `src/lib/storage/portfolio-storage.ts`

새 필드를 `AppState`에 추가하고 normalize/default 처리를 빠뜨리면 기존 사용자의 localStorage 데이터를 읽을 때 화면이 깨질 수 있다.

## 7. Prisma 스키마 상태

`prisma/schema.prisma`는 Phase 2 도메인을 반영하도록 확장되어 있다.

추가/확장된 주요 모델은 다음과 같다.

- `PortfolioSnapshot`
- `PortfolioSnapshotItem`
- `MonthlyReport`
- `MonthlyAllocationPlan`
- `Notification`
- `EmailLog`
- `UserNotificationSetting`
- `CsvImportJob`
- `CsvImportRow`

추가된 주요 enum은 다음과 같다.

- `SnapshotSource`
- `NotificationType`
- `NotificationPriority`
- `EmailType`
- `EmailStatus`
- `CsvImportStatus`
- `CsvRowValidationStatus`

주의할 점:

- Prisma Client 생성은 확인했다.
- 마이그레이션 파일은 아직 작성하지 않았다.
- 현재 UI/API는 Prisma DB를 사용하지 않는다.
- 서버 저장으로 전환하려면 API route 또는 server action, 인증, 사용자별 데이터 분리, migration 생성이 필요하다.

## 8. 주요 기능 흐름

### 8.1 온보딩과 대시보드

사용자는 초기 화면에서 자산군, 목표 비중, 기대수익률, 현재 보유 자산 정보를 입력한다. 입력 결과는 `AppState`에 저장된다.

대시보드는 저장된 상태를 읽어 다음을 보여준다.

- 총 평가금액
- 자산군별 현재 비중
- 목표 비중 대비 차이
- 포트폴리오 기대수익률
- 기준 포트폴리오 대비 차이
- 리밸런싱 필요 상태

대시보드에서 월간 스냅샷을 생성할 수 있다.

### 8.2 월간 스냅샷

핵심 파일:

- `src/lib/services/snapshot-service.ts`
- `src/components/screens/dashboard-client.tsx`
- `src/components/screens/snapshots-client.tsx`
- `src/components/screens/snapshot-detail-client.tsx`

스냅샷 생성 흐름:

1. 현재 `AppState`에서 계산 엔진을 실행한다.
2. 월 키를 만든다.
3. 같은 월의 active snapshot이 있는지 확인한다.
4. 중복 정책에 따라 생성/차단/교체를 처리한다.
5. 스냅샷 아이템을 생성한다.
6. 월간 리포트를 같이 생성한다.
7. 리밸런싱 제안 이력과 알림을 생성한다.
8. 필요 시 이메일 로그를 생성한다.

중복 월 정책:

- 기본 정책은 중복 생성을 막는다.
- replace 정책은 기존 active snapshot을 archived 처리하고 새 snapshot을 active로 저장한다.
- archived snapshot은 이력 보존 목적이며, 일반 비교/추세에서는 active snapshot 중심으로 사용한다.

상세 페이지는 `snapshotId`를 기준으로 localStorage에서 데이터를 찾는다. 직접 URL 접근 시에도 클라이언트가 로드된 뒤 표시된다.

### 8.3 월간 리포트

핵심 파일:

- `src/lib/services/report-service.ts`
- `src/components/screens/reports-client.tsx`
- `src/components/screens/report-detail-client.tsx`

리포트는 스냅샷 생성 시 자동으로 생성된다. 이전 active snapshot이 있으면 변화량을 계산하고, 없으면 첫 기록 기준으로 요약한다.

리포트에는 다음 정보가 포함된다.

- 대상 월
- 연결된 snapshot id
- 총 평가금액
- 포트폴리오 기대수익률
- 기준 포트폴리오 기대수익률
- 전월 대비 평가금액 변화
- 전월 대비 기대수익률 변화
- 자산군별 변화 상세
- 사람이 읽을 수 있는 한국어 요약

리포트는 실제 운용 성과 보고서가 아니라 입력 데이터 기준의 월간 기록 요약이다. 사용자에게 단정적 투자 판단으로 보이면 안 된다.

### 8.4 월간 배분 계획

핵심 파일:

- `src/lib/services/monthly-allocation-plan-service.ts`
- `src/components/screens/rebalance-client.tsx`

`/rebalance`에서 현재 비중과 목표 비중 차이를 기반으로 월간 배분 계획을 저장한다. 저장된 계획은 스냅샷/리포트와 같이 해당 월의 상태를 추적하는 용도다.

현재 저장되는 주요 값:

- 대상 월
- 총 평가금액
- 자산군별 현재 비중
- 자산군별 목표 비중
- 차이
- 상태
- 생성/수정 시각

동일 월 계획 저장 시 기존 계획을 갱신하는 흐름을 사용한다.

### 8.5 리밸런싱 이력

핵심 파일:

- `src/lib/services/rebalance-history-service.ts`
- `src/components/screens/rebalance-history-client.tsx`

스냅샷 생성 시 리밸런싱 제안 기록이 만들어진다. `/rebalance/history`에서 상태별 필터와 상태 변경을 제공한다.

현재 상태값은 다음 흐름을 가진다.

- `OPEN`
- `REVIEWED`
- `APPLIED`
- `DISMISSED`

이력은 특정 상품 주문 지시가 아니라 자산군 비중 차이를 검토하기 위한 기록이다. UI 문구를 추가할 때도 이 원칙을 유지해야 한다.

### 8.6 추세 차트

핵심 파일:

- `src/lib/services/trend-service.ts`
- `src/components/screens/trends-client.tsx`

추세 화면은 active snapshot이 2개 이상일 때 의미 있는 차트를 보여준다.

현재 제공하는 관점:

- 총 평가금액 추세
- 포트폴리오 기대수익률 추세
- 기준 포트폴리오 대비 차이 추세
- 자산군별 비중 추세

기간 필터는 `PeriodFilter` 기반이다. 데이터가 적은 상태에서 빈 차트가 나오지 않도록 안내 상태가 있다.

### 8.7 알림

핵심 파일:

- `src/lib/services/notification-service.ts`
- `src/components/screens/notifications-client.tsx`
- `src/components/screens/notification-settings-client.tsx`

앱 내 알림은 상태 변화와 스냅샷 생성 결과를 사용자에게 보여주기 위한 기록이다.

지원되는 동작:

- 알림 목록 표시
- 읽음 처리
- 전체 읽음 처리
- 우선순위/유형 표시
- 알림 설정 저장

알림 설정은 `UserNotificationSettings`로 관리한다.

주의할 점:

- 현재는 백그라운드 스케줄러가 없다.
- 실제 푸시, 문자, 이메일 발송은 하지 않는다.
- 앱 액션이 실행될 때 알림/이메일 로그가 생성되는 방식이다.

### 8.8 이메일 목업

핵심 파일:

- `src/lib/services/email-service.ts`
- `src/lib/emails/templates/*`

이메일은 실제 발송이 아니라 로그 생성과 템플릿 렌더링 중심이다.

현재 포함된 성격:

- 월간 리포트 생성 알림
- 리밸런싱 검토 알림
- 스냅샷 생성 알림

주의할 점:

- SMTP/API provider 연동이 없다.
- 수신자 검증, unsubscribe, 반송 처리, 발송 제한 정책이 없다.
- 실제 발송 기능을 붙이려면 법무/수신 동의/로그 보관 정책까지 먼저 정해야 한다.

### 8.9 CSV 가져오기

핵심 파일:

- `src/lib/services/csv-import-service.ts`
- `src/components/screens/csv-import-client.tsx`

현재 CSV 흐름:

1. 표준 템플릿 다운로드
2. CSV 텍스트 입력 또는 파일 내용 붙여넣기
3. 행별 파싱
4. 필수값/숫자값/중복 후보 검증
5. 미리보기 표시
6. 유효하거나 경고 수준인 행을 보유 자산으로 반영
7. import job과 row 기록 저장

현재 CSV 컬럼 성격:

- 자산명
- 자산군
- 평가금액
- 선택적 식별/메모 성격 필드

주의할 점:

- 특정 증권사 양식 파서는 없다.
- 행별 replace/skip 선택 UI는 없다.
- 경고 행은 확인 후 가져오기에 포함될 수 있다.
- 숫자 형식, 콤마, 공백, 빈 값 처리 테스트가 중요하다.

## 9. 테스트 현황

서비스 테스트는 `tests/services` 아래에 있다.

현재 테스트 범위:

- CSV 가져오기 검증/미리보기/반영
- 이메일 로그/템플릿 생성
- 월간 배분 계획 저장/갱신
- 알림 생성/읽음/설정
- 리밸런싱 이력 필터/상태 변경
- 리포트 생성 및 비교
- 스냅샷 생성, 중복 정책, 교체
- 추세 데이터 생성

테스트 실행:

```powershell
npm test
```

기능을 추가할 때의 기준:

- 순수 서비스 로직은 먼저 서비스 테스트로 고정한다.
- 화면 상태만 바뀌는 변경은 직접 브라우저 확인도 필요하다.
- 계산 엔진 변경은 대시보드, 리밸런싱, 스냅샷, 리포트, 추세를 함께 검증해야 한다.
- 상태 구조 변경은 기존 localStorage normalize 경로를 테스트해야 한다.

## 10. UI/UX 기준

이 앱은 운영 도구에 가깝다. 화려한 랜딩 페이지보다 정보 밀도와 반복 사용성을 우선한다.

현재 UI 방향:

- 첫 화면 이후에는 기능 중심 화면으로 이동
- 카드 남용보다 표, 리스트, 차트, 상태 배지를 사용
- 대시보드와 이력 화면은 빠르게 스캔 가능하게 구성
- 날짜/월/상태/금액/비중은 명확한 라벨로 표시
- 자산군 비중 변화는 색상과 숫자를 같이 사용

앞으로 UI를 바꿀 때 주의할 점:

- 화면 설명문을 과하게 늘리지 않는다.
- 버튼 텍스트가 좁은 화면에서 넘치지 않게 확인한다.
- 차트는 데이터가 부족한 상태, 로딩 전 상태, 빈 상태를 모두 처리한다.
- 같은 개념은 같은 색상/라벨/상태값을 유지한다.
- 금융 도구처럼 보이는 문구는 신중하게 쓴다.

## 11. 안전 문구와 제품 원칙

이 앱은 자산군 비중 점검과 기록 도구로 유지해야 한다. 특정 상품, 계좌, 주문, 매수/매도 행동을 지시하는 흐름으로 바꾸면 안 된다.

사용 가능한 방향:

- 사용자가 입력한 데이터 기준 계산
- 자산군 단위 비중 차이 표시
- 월간 기록과 비교
- 참고용 요약
- 사용자가 직접 검토해야 한다는 안내

피해야 하는 방향:

- 성과를 단정하는 표현
- 위험이 없다는 취지의 표현
- 원금이나 미래 수익에 대한 단정 표현
- 특정 상품/종목/티커에 대한 행동 지시
- 개인별 투자 자문처럼 보이는 문장
- 자동 주문 또는 자동 운용처럼 보이는 흐름

공통 고지 문구는 `src/lib/constants/disclaimer.ts`의 `REQUIRED_DISCLAIMER`를 기준으로 관리한다. 문구를 여러 파일에 직접 복사하면 나중에 수정 누락이 생기므로 상수를 재사용해야 한다.

## 12. 현재 한계와 미완성 지점

현재 앱은 기능 프로토타입 수준에서 Phase 2 요구를 충족한다. 다음 항목은 아직 실제 서비스 수준으로 완성되지 않았다.

- 서버 DB 저장 없음
- 인증/사용자 계정 없음
- 사용자별 데이터 격리 없음
- Prisma migration 없음
- 서버 API 없음
- 실제 이메일 발송 없음
- 백그라운드 알림 스케줄러 없음
- CSV 증권사별 포맷 대응 없음
- CSV 행별 충돌 처리 UI 없음
- 스냅샷/리포트 export 없음
- 모바일 세부 화면에 대한 충분한 회귀 확인 부족
- 접근성 전체 점검 부족
- 외부 출시 전 법무 검토 필요

## 13. 다음 작업 우선순위

가장 현실적인 다음 순서는 다음과 같다.

1. DB 전환 설계
   - 현재 `AppState` 컬렉션을 Prisma 모델에 매핑한다.
   - migration을 생성한다.
   - 사용자/계정 모델이 필요한지 결정한다.
   - localStorage 데이터를 DB로 옮기는 마이그레이션 UX를 설계한다.

2. 서버 API 또는 server action 추가
   - 스냅샷 생성
   - 리포트 조회
   - 리밸런싱 이력 상태 변경
   - 알림 읽음 처리
   - CSV import job 생성

3. 인증 추가
   - 사용자별 포트폴리오 분리
   - localStorage fallback 유지 여부 결정
   - 민감 데이터 저장 범위 결정

4. CSV 가져오기 고도화
   - 행별 skip/merge/replace UI
   - 컬럼 매핑 UI
   - 실패 행 다운로드
   - import rollback 또는 undo

5. 리포트 내보내기
   - PDF 또는 CSV export
   - 화면 표시용 요약과 export용 요약 분리
   - 고지 문구 자동 포함

6. 알림/이메일 실제화
   - 수신 동의 설정
   - 발송 provider 선정
   - 재시도/실패/중복 방지
   - 수신 거부/로그 보관 정책

7. UI 회귀 테스트
   - Playwright 도입 검토
   - 대시보드, 스냅샷, 리포트, CSV import 핵심 플로우 자동화
   - 모바일 뷰포트 확인

## 14. 작업 시 체크리스트

기능 코드를 바꾸기 전:

- `git status --short`로 현재 변경사항 확인
- 내가 만든 변경과 기존 변경을 구분
- 타입과 normalize 경로 확인
- 영향받는 화면 목록 확인

기능 코드를 바꾼 뒤:

- `npm test`
- `npm run build`
- 필요 시 `npm run prisma:generate`
- 필요 시 브라우저에서 해당 라우트 직접 확인
- localStorage에 기존 데이터가 있을 때도 깨지지 않는지 확인

문구를 바꾼 뒤:

- 특정 상품 행동 지시처럼 보이는지 확인
- 성과 단정 문구가 없는지 확인
- 공통 고지 상수를 재사용했는지 확인
- 이메일/리포트/README/샘플 데이터까지 같이 확인

상태 모델을 바꾼 뒤:

- `src/lib/types.ts`
- `src/lib/storage/default-state.ts`
- `src/lib/storage/portfolio-storage.ts`
- 관련 서비스 테스트
- Prisma schema와의 이름/의미 일관성

## 15. 디버깅 팁

### 15.1 화면에 데이터가 안 보일 때

먼저 브라우저 localStorage를 확인한다. 이 앱은 현재 서버 DB가 아니라 localStorage를 본다.

확인할 것:

- `AppState` 저장 키가 존재하는지
- `assets`, `snapshots`, `monthlyReports` 배열이 비어 있지 않은지
- 저장된 JSON이 깨지지 않았는지
- 이전 구조의 데이터가 normalize 되는지

### 15.2 스냅샷이 생성되지 않을 때

확인할 것:

- 현재 자산 데이터가 있는지
- 같은 월 active snapshot이 이미 있는지
- 중복 정책이 block인지 replace인지
- 계산 엔진에서 총 평가금액이 0으로 나오지 않는지

### 15.3 리포트가 비어 있을 때

리포트는 스냅샷 생성 흐름에서 같이 만들어진다. 스냅샷만 수동으로 상태에 넣으면 리포트가 없을 수 있다.

확인할 것:

- `monthlyReports`에 연결된 `snapshotId`가 있는지
- 해당 snapshot이 active인지 archived인지
- 이전 snapshot이 없어도 첫 리포트 요약이 생성되는지

### 15.4 추세 차트가 비어 있을 때

추세는 active snapshot 2개 이상이 있어야 의미 있게 표시된다.

확인할 것:

- active snapshot 수
- 월 필터 범위
- snapshot item에 자산군별 비중이 들어 있는지
- archived snapshot만 남아 있는지

### 15.5 CSV import가 이상할 때

확인할 것:

- 헤더명이 템플릿과 맞는지
- 숫자에 불필요한 문자나 빈 값이 섞였는지
- 같은 자산명이 이미 있는지
- warning 행을 가져오기 대상으로 포함해도 되는 상황인지

### 15.6 PowerShell에서 한글이 깨져 보일 때

파일이 실제로 깨진 것이 아니라 터미널 인코딩 표시 문제일 수 있다. 에디터에서 UTF-8로 열어 확인하고, 필요하면 PowerShell 출력 인코딩을 조정한다.

## 16. 변경 이력 관점의 Phase 2 구현 요약

Phase 2에서 추가된 큰 덩어리는 다음과 같다.

- `src/lib/services` 도메인 서비스 계층 신설
- 월간 스냅샷과 리포트 데이터 모델 확장
- 리밸런싱 계획/이력 저장 기능 추가
- 알림/이메일 로그 모델과 화면 추가
- CSV import 모델과 화면 추가
- 추세 차트 화면 추가
- Prisma schema 확장
- AppState/default/normalize 확장
- 서비스 테스트 추가
- README 업데이트

## 17. 다음 에이전트가 특히 조심할 부분

다음 작업자가 이어받을 때 가장 중요한 점은 다음이다.

- 이 앱의 진짜 저장소는 아직 localStorage다.
- Prisma schema가 있다고 해서 화면이 DB를 쓰는 것은 아니다.
- `AppState` 타입 변경은 normalize/default 처리와 세트로 해야 한다.
- 스냅샷 생성은 리포트, 알림, 이메일 로그, 리밸런싱 이력까지 함께 건드린다.
- archived snapshot과 active snapshot의 의미를 섞으면 추세/리포트 비교가 틀어진다.
- 리밸런싱은 자산군 비중 점검이지 특정 상품 행동 지시가 아니다.
- 이메일은 목업 로그이며 실제 발송이 아니다.
- README나 리포트 문구를 바꿀 때도 제품 안전 원칙을 지켜야 한다.

## 18. 권장 작업 방식

작은 변경도 다음 순서를 권장한다.

1. 관련 서비스 테스트를 먼저 읽는다.
2. 서비스 함수를 수정한다.
3. 화면 컴포넌트는 서비스 결과를 표시하는 정도로 유지한다.
4. `AppState` 구조 변경이 있으면 default/normalize를 같이 수정한다.
5. 테스트를 추가하거나 갱신한다.
6. `npm test`와 `npm run build`를 실행한다.
7. 실제 화면에서 핵심 경로를 확인한다.

기능이 커질수록 화면에서 바로 로직을 늘리기보다 `src/lib/services`에 먼저 넣는 편이 유지보수에 맞다.

## 19. 현재 기준 완료 판단

현재 Phase 2 완료로 볼 수 있는 항목:

- 월간 스냅샷 생성
- 월간 리포트 생성/조회
- 월간 배분 계획 저장
- 리밸런싱 이력 관리
- 추세 차트
- 앱 내 알림
- 알림 설정
- 이메일 목업 로그
- CSV 가져오기 기본 흐름
- Prisma schema 확장
- 서비스 테스트
- 빌드 통과
- 보안 audit 통과

아직 완료로 보면 안 되는 항목:

- 실제 서비스 배포 준비
- DB 기반 영속화
- 사용자 인증
- 실제 이메일 발송
- 자동 스케줄링
- 외부 규제/법무 검토 완료
- 증권사별 CSV 대응
- E2E 테스트 체계

## 20. 마지막으로

이 저장소에서 다음 작업을 시작하는 에이전트는 먼저 `README.md`, `HANDOVER.md`, `src/lib/types.ts`, `src/lib/storage/portfolio-storage.ts`, `src/lib/services/snapshot-service.ts`를 읽으면 전체 구조를 가장 빠르게 잡을 수 있다.

기능을 바로 확인하려면 개발 서버를 켜고 다음 순서로 보면 된다.

```text
/dashboard
/snapshots
/reports
/rebalance
/rebalance/history
/trends
/notifications
/settings/notifications
/import/csv
```

데이터가 없으면 온보딩 또는 샘플 입력을 먼저 진행해야 한다. 추세와 월간 비교 기능은 스냅샷이 여러 개 있을 때 제대로 확인된다.

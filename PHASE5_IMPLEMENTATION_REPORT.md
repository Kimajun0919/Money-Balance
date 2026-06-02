# Phase 5 구현 보고서

## 1. 구현한 파일 목록

- `src/lib/engines/rebalancing-engine.ts`
- `src/lib/engines/rebalancing-drift-engine.ts`
- `src/lib/engines/rebalancing-plan-engine.ts`
- `src/lib/engines/rebalancing-risk-engine.ts`
- `src/lib/engines/rebalancing-execution-engine.ts`
- `src/lib/services/rebalancing-service.ts`
- `src/lib/services/rebalancing-plan-service.ts`
- `src/lib/services/rebalancing-rule-service.ts`
- `src/lib/services/rebalancing-execution-service.ts`
- `src/lib/services/rebalancing-scheduler-service.ts`
- `src/lib/services/rebalancing-audit-service.ts`
- `src/components/rebalancing/*`
- `src/app/rebalancing/*`
- `tests/phase5/*`
- `prisma/schema.prisma`
- `README.md`

## 2. 추가된 DB 모델 및 마이그레이션 설명

Prisma 기준 모델에 `RebalancingPolicy`, `RebalancingRule`, `RebalancingSnapshot`, `RebalancingPlan`, `RebalancingPlanItem`, `RebalancingExecution`, `RebalancingEvent`, `RebalancingAuditLog`, `RebalancingSchedulerRun`, `RebalancingUserAcknowledgement`를 추가했습니다.

현재 앱은 localStorage 기반 MVP이므로 migration 파일은 생성하지 않았습니다. 실제 DB 전환 시 사용자 계정, 권한 분리, 기존 localStorage 이전 UX와 함께 migration을 생성해야 합니다.

## 3. 리밸런싱 정책 구조

정책은 기준 드리프트, 최소/최대 주문 금액, 총 리밸런싱 한도, 일/월 한도, 주문 횟수, 현금비중 한도, 매수/매도 허용, 현금 우선, 지정가 선호, 확인 조건, cooldown을 포함합니다. 기본값은 분석 전용, 현금 우선, 매수 허용, 매도 비허용입니다.

## 4. 리밸런싱 규칙 구조

규칙은 스케줄, 임계값, 현금 트리거, 대상/제외 자산군, 허용/제외 상품, 주문 한도, 위험 한도, cooldown, 수동 검토 여부를 갖습니다. 기본 규칙은 비활성 상태이며 자동 활성화에는 별도 사용자 확인이 필요합니다.

## 5. 드리프트 계산 방식

현재 평가금액을 자산군별로 합산해 현재비중을 계산하고, 기존 목표배분 엔진의 목표비중과 비교합니다.

```text
drift = currentWeight - targetWeight
absoluteDrift = abs(drift)
```

기준값 이상이면 리밸런싱 검토가 필요합니다.

## 6. 리밸런싱 필요 여부 판단

자산군별 절대 드리프트가 정책의 `assetClassThresholdPercent` 이상이면 필요 상태로 판단합니다. 기준 안이면 스케줄러는 no-op 실행을 기록합니다.

## 7. 현금 우선 리밸런싱 로직

현금성 자산 중 최소 현금비중을 초과하는 금액만 사용 가능 현금으로 봅니다. 부족 자산군을 큰 드리프트 순서로 정렬하고, 상품 유니버스에서 해당 자산군의 거래 가능 상품을 찾아 매수 제안을 생성합니다.

## 8. 매도 주문 보호 로직

매도는 기본적으로 비활성화되어 있습니다. 정책에서 `allowSellOrders`를 켠 경우에만 초과 자산군 매도 항목을 생성하며, 매도 항목은 별도 확인 상태로 표시합니다.

## 9. 리밸런싱 계획 생성 로직

계획 생성 시 분석 스냅샷을 만들고, 드리프트 결과와 정책을 바탕으로 계획 항목을 생성합니다. 상품 후보가 없거나 위험 점검을 통과하지 못한 항목은 차단 상태로 남깁니다.

## 10. 주문 제안 변환 방식

계획 항목은 실행 서비스에서 `OrderProposal`로 변환됩니다. 모의/샌드박스는 제출 상태로 기록하고, 실거래 수동 리밸런싱은 주문 제안 상태로 남겨 사용자 확인을 요구합니다.

## 11. 모의 리밸런싱 실행 구조

모의 실행은 계획 항목을 모의 주문 제안으로 변환하고 실행 기록, 주문 이벤트, 리밸런싱 이벤트, 감사 로그를 저장합니다.

## 12. 증권사 샌드박스 구조

샌드박스 실행은 주문 API 설정 플래그와 샌드박스 리밸런싱 플래그를 확인한 뒤 샌드박스 주문 이벤트로 기록합니다. 실제 브로커 호출은 아직 모의 구조입니다.

## 13. 실거래 수동 리밸런싱 구조

실거래 수동 리밸런싱은 `liveRebalancingEnabled`, `liveTradingEnabled`, 브로커 연결, 사용자 거래 확인, 리밸런싱 확인, 원금 손실 확인을 요구합니다. 통과 시 실제 주문이 아니라 주문 제안만 생성합니다.

## 14. 실거래 자동 리밸런싱 비활성화 조건

실거래 자동 리밸런싱은 기본값에서 차단됩니다. 자동 리밸런싱, 자동매매, 실거래, 브로커 연결, 사용자 자동 확인, 위험 확인, 중지 스위치 조건을 모두 통과해야 구조적으로 실행 가능합니다.

## 15. 자동 리밸런싱 스케줄러

스케줄러는 활성 규칙을 읽고 cooldown, 드리프트, 현금 트리거를 확인합니다. 필요 없으면 no-op run을 저장하고, 필요하면 계획을 생성합니다. 규칙이 수동 검토를 요구하지 않고 정책 모드가 실행 모드이면 실행 서비스로 넘깁니다.

## 16. 리밸런싱 리스크 엔진

위험 엔진은 현금비중, 주문 한도, 총 리밸런싱 한도, 일/월 한도, 주문 횟수, 오래된 가격, 차단 상품, 위험점수, cooldown, 중지 스위치를 확인합니다.

## 17. 킬스위치 연동

중지 스위치가 켜지면 실거래, 자동매매, 실거래 리밸런싱, 자동 리밸런싱이 꺼지고 계획 생성 또는 실행이 차단됩니다.

## 18. 사용자 동의 및 확인 절차

수동 리밸런싱, 자동 리밸런싱, 매도 주문, 대형 주문, 실거래 리밸런싱 확인 기록을 별도 모델에 저장합니다. 실거래 리밸런싱 활성화는 거래 확인과 리밸런싱 확인을 모두 요구합니다.

## 19. 리밸런싱 이벤트 로그

스냅샷 생성, 드리프트 감지, no-op, 계획 생성, 계획 승인/거절, 실행 완료, 차단, 실패 이벤트를 `rebalancingEvents`에 저장합니다.

## 20. 리밸런싱 감사 로그

감사 로그는 입력, 출력, 안전 플래그 스냅샷, 위험 점검 결과, 사용자 확인 스냅샷을 저장합니다. 생성 후 수정하지 않는 불변 이력으로 취급합니다.

## 21. 테스트 실행 방법

```bash
npm test
npm run build
npm run prisma:generate
npm audit
```

## 22. 통과한 테스트 목록

- 드리프트 계산
- 기준값 이하 no-op 판단
- 현금 우선 매수 계획
- 기본 매도 차단
- 매도 허용 정책
- 주문 한도 및 오래된 가격 차단
- 계획 저장과 감사 로그
- 모의 리밸런싱 실행
- 실거래 자동 리밸런싱 기본 차단
- 실거래 리밸런싱 사용자 확인
- 스케줄러 no-op
- 중지 스위치 차단

## 23. 남은 작업

- 실제 브로커 주문 API 연동
- 실제 체결 결과와 주문 취소 처리
- 서버 DB migration 생성
- 사용자별 인증과 권한 분리
- 세금/수수료 상세 모델링
- 고급 스케줄 표현식 파서
- 실제 종목별 목표비중 관리

## 24. Phase 5 PRD 대비 구현/미구현

구현:

- 리밸런싱 대시보드, 설정, 계획 상세, 규칙, 이력, 감사 화면
- 정책/규칙/스냅샷/계획/항목/실행/이벤트/감사/스케줄러/동의 모델
- 드리프트 계산
- 현금 우선 계획
- 매도 보호
- 위험 점검
- 모의/샌드박스/실거래 수동 구조
- 실거래 자동 기본 차단
- 스케줄러 no-op
- 감사 로그

미구현:

- 실제 브로커 주문 전송
- 실제 자동 스케줄 백그라운드 실행
- 실제 체결 기반 포트폴리오 갱신
- PDF/CSV 리밸런싱 export

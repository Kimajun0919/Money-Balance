import { NextResponse } from "next/server";
import {
  KoreaInvestmentBrokerProvider,
  type KisOrderInput
} from "@/lib/providers/broker/kis-broker-provider";
import { validateKisServerRouteRequest } from "@/lib/providers/broker/kis-route-guard";

export const dynamic = "force-dynamic";

function toErrorMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : "한국투자증권 주문 제출에 실패했습니다.";
}

export async function POST(request: Request) {
  try {
    const guard = validateKisServerRouteRequest(request);
    if (!guard.allowed) {
      return NextResponse.json({ error: guard.message }, { status: guard.status });
    }

    const body = (await request.json().catch(() => ({}))) as {
      order?: KisOrderInput;
    };
    if (!body.order) {
      return NextResponse.json(
        { error: "KIS 주문 요청 정보가 필요합니다." },
        { status: 400 }
      );
    }

    const provider = new KoreaInvestmentBrokerProvider();
    const orderResult = await provider.submitOrder(body.order);

    return NextResponse.json({ orderResult });
  } catch (error) {
    return NextResponse.json({ error: toErrorMessage(error) }, { status: 400 });
  }
}

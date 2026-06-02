import { NextResponse } from "next/server";
import { KoreaInvestmentBrokerProvider } from "@/lib/providers/broker/kis-broker-provider";
import { validateKisServerRouteRequest } from "@/lib/providers/broker/kis-route-guard";

export const dynamic = "force-dynamic";

function toErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "한국투자증권 잔고 조회에 실패했습니다.";
}

export async function POST(request: Request) {
  try {
    const guard = validateKisServerRouteRequest(request);
    if (!guard.allowed) {
      return NextResponse.json({ error: guard.message }, { status: guard.status });
    }

    const body = (await request.json().catch(() => ({}))) as {
      connectionId?: string;
      accountAlias?: string;
    };
    const provider = new KoreaInvestmentBrokerProvider({
      accountAlias: body.accountAlias
    });
    const syncResult = await provider.sync(body.connectionId ?? "kis");

    return NextResponse.json({ syncResult });
  } catch (error) {
    return NextResponse.json({ error: toErrorMessage(error) }, { status: 400 });
  }
}

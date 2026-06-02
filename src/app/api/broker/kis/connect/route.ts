import { NextResponse } from "next/server";
import { KoreaInvestmentBrokerProvider } from "@/lib/providers/broker/kis-broker-provider";
import { validateKisServerRouteRequest } from "@/lib/providers/broker/kis-route-guard";

export const dynamic = "force-dynamic";

function toErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "한국투자증권 연결에 실패했습니다.";
}

export async function POST(request: Request) {
  try {
    const guard = validateKisServerRouteRequest(request);
    if (!guard.allowed) {
      return NextResponse.json({ error: guard.message }, { status: guard.status });
    }

    const body = (await request.json().catch(() => ({}))) as {
      accountAlias?: string;
      consentAccepted?: boolean;
    };
    const provider = new KoreaInvestmentBrokerProvider({
      accountAlias: body.accountAlias
    });
    const connectionResult = await provider.connect({
      accessToken: "server-managed-kis-token",
      accountAlias: body.accountAlias,
      consentAccepted: Boolean(body.consentAccepted)
    });

    return NextResponse.json({ connectionResult });
  } catch (error) {
    return NextResponse.json({ error: toErrorMessage(error) }, { status: 400 });
  }
}

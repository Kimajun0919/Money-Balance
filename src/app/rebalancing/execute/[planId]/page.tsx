import { RealRebalancingExecuteClient } from "@/components/screens/real-rebalancing-execute-client";

export default async function RebalancingExecutePage({
  params
}: {
  params: Promise<{ planId: string }>;
}) {
  const { planId } = await params;
  return <RealRebalancingExecuteClient planId={planId} />;
}

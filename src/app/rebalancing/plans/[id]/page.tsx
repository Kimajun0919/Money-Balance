import { RebalancingPlanDetail } from "@/components/rebalancing/RebalancingPlanDetail";

export default async function RebalancingPlanDetailPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <RebalancingPlanDetail planId={id} />;
}

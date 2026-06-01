import { SnapshotDetailClient } from "@/components/screens/snapshot-detail-client";

export default async function SnapshotDetailPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <SnapshotDetailClient snapshotId={id} />;
}

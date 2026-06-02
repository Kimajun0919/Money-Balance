import { ConnectionDetailClient } from "@/components/screens/connection-detail-client";

export default async function ConnectionDetailPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ConnectionDetailClient connectionId={id} />;
}

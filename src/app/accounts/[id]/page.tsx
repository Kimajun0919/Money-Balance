import { AccountDetailClient } from "@/components/screens/account-detail-client";

export default async function AccountDetailPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <AccountDetailClient accountId={id} />;
}

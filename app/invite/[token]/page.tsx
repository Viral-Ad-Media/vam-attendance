export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

import AcceptInvitePage from "./page.client";

export default async function InviteAcceptPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  return <AcceptInvitePage token={token} />;
}

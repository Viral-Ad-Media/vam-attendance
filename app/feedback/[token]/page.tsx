export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

import StudentFeedbackFormClient from "./page.client";

export default async function StudentFeedbackPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  return <StudentFeedbackFormClient token={token} />;
}

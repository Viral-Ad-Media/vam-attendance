import SessionAttendanceClient from "./page.client";

export default async function SessionAttendancePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <SessionAttendanceClient sessionId={id} />;
}

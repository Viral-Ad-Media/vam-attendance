import { getAuth } from "@/lib/auth/server";
import type { DatabaseClient } from "@/lib/db/query";
export async function sendTeacherSetupEmail(input: {
  service: DatabaseClient;
  teacherEmail: string;
  teacherName?: string | null;
  organizationName?: string | null;
}) {
  await getAuth().api.requestPasswordReset({
    body: {
      email: input.teacherEmail.trim().toLowerCase(),
      redirectTo: `${process.env.BETTER_AUTH_URL}/auth/reset-password`,
    },
  });
}

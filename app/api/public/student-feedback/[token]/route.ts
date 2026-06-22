import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { ApiError, respondWithError } from "@/lib/api/errors";
import { hashFeedbackToken } from "@/lib/api/student-feedback-email";
import { getServiceClient } from "@/lib/supabase/service";

const submissionSchema = z.object({
  rating: z.number().int().min(1).max(5).optional().nullable(),
  body: z.string().trim().min(3).max(4000),
});

type RouteParamsPromise = { params: Promise<{ token: string }> };

type FeedbackRequestRow = {
  id: string;
  org_id: string;
  attendance_id: string;
  student_id: string;
  session_id: string;
  expires_at: string;
  submitted_at?: string | null;
};

type StudentRow = {
  id: string;
  name: string;
};

type SessionRow = {
  id: string;
  title?: string | null;
  starts_at?: string | null;
  course_id?: string | null;
  teacher_id?: string | null;
};

type OrganizationRow = {
  id: string;
  name?: string | null;
};

function isExpired(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) || date.getTime() < Date.now();
}

function formatTitle(session?: SessionRow | null) {
  return session?.title?.trim() ? `Feedback for ${session.title}` : "Student session feedback";
}

async function loadFeedbackRequest(token: string) {
  if (!token || token.length < 24) {
    throw new ApiError("Feedback link is invalid", 404, "FEEDBACK_LINK_INVALID");
  }

  const service = getServiceClient();
  const tokenHash = hashFeedbackToken(token);
  const { data: request, error } = await service
    .from("student_feedback_requests")
    .select("id, org_id, attendance_id, student_id, session_id, expires_at, submitted_at")
    .eq("token_hash", tokenHash)
    .maybeSingle<FeedbackRequestRow>();

  if (error) throw error;
  if (!request) {
    throw new ApiError("Feedback link was not found", 404, "FEEDBACK_LINK_NOT_FOUND");
  }

  const [studentResult, sessionResult, orgResult] = await Promise.all([
    service
      .from("students")
      .select("id, name")
      .eq("org_id", request.org_id)
      .eq("id", request.student_id)
      .maybeSingle<StudentRow>(),
    service
      .from("sessions")
      .select("id, title, starts_at, course_id, teacher_id")
      .eq("org_id", request.org_id)
      .eq("id", request.session_id)
      .maybeSingle<SessionRow>(),
    service
      .from("organizations")
      .select("id, name")
      .eq("id", request.org_id)
      .maybeSingle<OrganizationRow>(),
  ]);

  if (studentResult.error) throw studentResult.error;
  if (sessionResult.error) throw sessionResult.error;
  if (orgResult.error) throw orgResult.error;

  return {
    service,
    request,
    student: studentResult.data,
    session: sessionResult.data,
    organization: orgResult.data,
  };
}

export async function GET(_: NextRequest, { params }: RouteParamsPromise) {
  try {
    const { token } = await params;
    const { request, student, session, organization } = await loadFeedbackRequest(token);

    if (isExpired(request.expires_at)) {
      return NextResponse.json({ error: "Feedback link has expired" }, { status: 410 });
    }

    return NextResponse.json({
      submitted: Boolean(request.submitted_at),
      expires_at: request.expires_at,
      student: {
        name: student?.name ?? "Student",
      },
      session: {
        title: session?.title ?? "Session",
        starts_at: session?.starts_at ?? null,
      },
      organization: {
        name: organization?.name ?? "VAM Attendance",
      },
    });
  } catch (error) {
    return respondWithError(error, { action: "get-public-student-feedback" });
  }
}

export async function POST(request: NextRequest, { params }: RouteParamsPromise) {
  try {
    const { token } = await params;
    const body = await request.json();
    const payload = submissionSchema.parse(body);
    const { service, request: feedbackRequest, session } = await loadFeedbackRequest(token);

    if (isExpired(feedbackRequest.expires_at)) {
      return NextResponse.json({ error: "Feedback link has expired" }, { status: 410 });
    }

    if (feedbackRequest.submitted_at) {
      return NextResponse.json({ error: "Feedback has already been submitted" }, { status: 409 });
    }

    const now = new Date().toISOString();
    const { data: feedback, error: feedbackError } = await service
      .from("student_feedback")
      .insert([
        {
          org_id: feedbackRequest.org_id,
          student_id: feedbackRequest.student_id,
          attendance_id: feedbackRequest.attendance_id,
          teacher_id: session?.teacher_id ?? null,
          course_id: session?.course_id ?? null,
          session_id: feedbackRequest.session_id,
          rating: payload.rating ?? null,
          category: "general",
          sentiment: "neutral",
          visibility: "internal",
          source: "student",
          title: formatTitle(session),
          body: payload.body,
          reviewed_at: now,
        },
      ])
      .select("id")
      .single<{ id: string }>();

    if (feedbackError) throw feedbackError;

    const { error: updateError } = await service
      .from("student_feedback_requests")
      .update({ submitted_at: now, feedback_id: feedback.id })
      .eq("id", feedbackRequest.id);

    if (updateError) throw updateError;

    return NextResponse.json({ success: true });
  } catch (error) {
    return respondWithError(error, { action: "submit-public-student-feedback" });
  }
}

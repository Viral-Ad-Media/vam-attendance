import { NextResponse } from "next/server";
import { ZodError } from "zod";

export class ApiError extends Error {
  status: number;
  code?: string;
  details?: unknown;
  hint?: string;

  constructor(message: string, status = 500, code?: string, details?: unknown, hint?: string) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
    this.hint = hint;
  }
}

type SupabasePostgrestError = {
  code?: string;
  message?: string;
  details?: string | null;
  hint?: string | null;
};

function mapPostgrestError(error: SupabasePostgrestError) {
  if (!error || !error.code) return null;

  // Common PG / PostgREST codes we see in this app
  const base = {
    code: error.code,
    error: error.message || "Database error",
    details: error.details ?? undefined,
    hint: error.hint ?? undefined,
  };

  switch (error.code) {
    case "42501": // insufficient_privilege (often RLS)
      return {
        status: 403,
        body: {
          ...base,
          error: "Blocked by Row Level Security",
          hint:
            error.hint ||
            "Ensure the user has a membership/owner role for this org and the org_id sent matches their org.",
        },
      };
    case "23505": // unique_violation
      return {
        status: 409,
        body: { ...base, error: "Already exists", hint: error.hint || "Check unique fields (e.g., email/title)." },
      };
    case "23503": // foreign_key_violation
      return {
        status: 400,
        body: {
          ...base,
          error: "Related record missing",
          hint: error.hint || "Check that related ids belong to the same org and exist.",
        },
      };
    case "42703": // undefined_column
      return {
        status: 400,
        body: { ...base, error: "Column not found", hint: error.hint || "Run the latest database migration." },
      };
    default:
      return { status: 500, body: base };
  }
}

export function respondWithError(error: unknown, context?: { action?: string }) {
  const ctx = context?.action ? `[${context.action}] ` : "";

  if (error instanceof ApiError) {
    console.error(`${ctx}ApiError`, error);
    return NextResponse.json(
      { error: error.message, code: error.code, details: error.details, hint: error.hint },
      { status: error.status }
    );
  }

  if (error instanceof ZodError) {
    return NextResponse.json({ error: "Validation failed", details: error.errors }, { status: 400 });
  }

  const pg = mapPostgrestError(error as SupabasePostgrestError);
  if (pg) {
    console.error(`${ctx}PostgREST error`, error);
    return NextResponse.json(pg.body, { status: pg.status });
  }

  if (error instanceof Error) {
    if (error.message === "unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (error.message === "org_not_set") {
      return NextResponse.json({ error: "Organization not set for user", hint: "Re-authenticate or set default org" }, { status: 400 });
    }
    console.error(`${ctx}Unhandled error`, error);
    return NextResponse.json({ error: error.message || "Unexpected error" }, { status: 500 });
  }

  console.error(`${ctx}Unknown error`, error);
  return NextResponse.json({ error: "Unexpected error", details: String(error) }, { status: 500 });
}

"use client";

import * as React from "react";
import { AlertCircle, CheckCircle2, Loader2, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Textarea from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type FeedbackContext = {
  submitted: boolean;
  expires_at: string;
  student: {
    name: string;
  };
  session: {
    title: string;
    starts_at?: string | null;
  };
  organization: {
    name: string;
  };
};

async function readResponseError(response: Response, fallback: string) {
  const text = await response.text();
  try {
    const parsed = JSON.parse(text) as { error?: string; message?: string };
    return parsed.error || parsed.message || fallback;
  } catch {
    return text || fallback;
  }
}

function formatDate(value?: string | null) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function StudentFeedbackFormClient({ token }: { token: string }) {
  const [context, setContext] = React.useState<FeedbackContext | null>(null);
  const [rating, setRating] = React.useState<number | null>(null);
  const [body, setBody] = React.useState("");
  const [loading, setLoading] = React.useState(true);
  const [submitting, setSubmitting] = React.useState(false);
  const [submitted, setSubmitted] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await fetch(`/api/public/student-feedback/${encodeURIComponent(token)}`, {
          cache: "no-store",
        });
        if (!response.ok) {
          throw new Error(await readResponseError(response, "Feedback link is unavailable"));
        }
        const data = (await response.json()) as FeedbackContext;
        setContext(data);
        setSubmitted(data.submitted);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Feedback link is unavailable");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [token]);

  const submitFeedback = async () => {
    if (body.trim().length < 3) {
      setError("Please add a short note before submitting.");
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      const response = await fetch(`/api/public/student-feedback/${encodeURIComponent(token)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rating,
          body,
        }),
      });

      if (!response.ok) {
        throw new Error(await readResponseError(response, "Could not submit feedback"));
      }

      setSubmitted(true);
      setBody("");
      setRating(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not submit feedback");
    } finally {
      setSubmitting(false);
    }
  };

  const sessionDate = formatDate(context?.session.starts_at);

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 text-slate-950 sm:px-6">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-2xl items-center">
        <Card className="w-full">
          <CardHeader>
            <div className="mb-3 inline-flex h-11 w-11 items-center justify-center rounded-lg bg-slate-950 text-white">
              <Star className="h-5 w-5" />
            </div>
            <CardTitle className="text-2xl">Session Feedback</CardTitle>
            {context && (
              <div className="space-y-1 text-sm text-slate-600">
                <p className="font-medium text-slate-800">{context.organization.name}</p>
                <p>
                  {context.session.title}
                  {sessionDate ? ` - ${sessionDate}` : ""}
                </p>
              </div>
            )}
          </CardHeader>
          <CardContent className="space-y-5">
            {loading && (
              <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading feedback form...
              </div>
            )}

            {!loading && error && !context && (
              <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {!loading && submitted && (
              <div className="flex items-start gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-4 text-sm text-emerald-700">
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
                <div>
                  <p className="font-semibold">Feedback received.</p>
                  <p className="mt-1">Thank you for sharing your thoughts.</p>
                </div>
              </div>
            )}

            {!loading && context && !submitted && (
              <>
                <div>
                  <p className="mb-2 text-sm font-semibold text-slate-800">Rating</p>
                  <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map((value) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setRating(value)}
                        className={cn(
                          "flex h-11 w-11 items-center justify-center rounded-lg border transition",
                          rating && value <= rating
                            ? "border-amber-300 bg-amber-50 text-amber-500"
                            : "border-slate-200 bg-white text-slate-300 hover:border-slate-300 hover:text-slate-500"
                        )}
                        aria-label={`${value} star${value === 1 ? "" : "s"}`}
                      >
                        <Star className={cn("h-5 w-5", rating && value <= rating && "fill-amber-400")} />
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label htmlFor="student-feedback-body" className="mb-2 block text-sm font-semibold text-slate-800">
                    Feedback
                  </label>
                  <Textarea
                    id="student-feedback-body"
                    value={body}
                    onChange={(event) => setBody(event.target.value)}
                    placeholder="Share anything helpful about this session"
                    className="min-h-[160px]"
                  />
                </div>

                {error && (
                  <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {error}
                  </div>
                )}

                <Button onClick={submitFeedback} disabled={submitting} className="w-full">
                  {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                  Submit Feedback
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}

import { NextResponse } from "next/server";
import { getAuth } from "@/lib/auth/server";
import { z } from "zod";
export async function POST(request: Request) {
  try {
    const body = z
      .object({ email: z.string().email(), password: z.string().min(8) })
      .parse(await request.json());
    const forwarded = new Headers(request.headers);
    forwarded.set("Content-Type", "application/json");
    return await getAuth().handler(
      new Request(new URL("/api/auth/sign-in/email", request.url), {
        method: "POST",
        headers: forwarded,
        body: JSON.stringify({ ...body, email: body.email.toLowerCase() }),
      }),
    );
  } catch {
    return NextResponse.json(
      { error: "Invalid email or password" },
      { status: 401 },
    );
  }
}

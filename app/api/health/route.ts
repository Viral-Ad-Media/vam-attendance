import { NextResponse } from "next/server";
import { getPool } from "@/lib/db/pool";
export const runtime = "nodejs";
export async function GET() {
  try {
    if (
      !process.env.BETTER_AUTH_URL ||
      (process.env.BETTER_AUTH_SECRET?.length ?? 0) < 32
    )
      throw new Error("Auth configuration missing");
    await getPool().query("SELECT 1 FROM auth_users LIMIT 1");
    return NextResponse.json({
      status: "ok",
      database: "neon",
      auth: "better-auth",
    });
  } catch {
    return NextResponse.json({ status: "unavailable" }, { status: 503 });
  }
}

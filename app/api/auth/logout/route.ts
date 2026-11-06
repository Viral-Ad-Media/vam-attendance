import { getAuth } from "@/lib/auth/server";
import { cookies } from "next/headers";
export async function POST(request: Request) {
  const forwarded = new Headers(request.headers);
  forwarded.set("Content-Type", "application/json");
  const response = await getAuth().handler(
    new Request(new URL("/api/auth/sign-out", request.url), {
      method: "POST",
      headers: forwarded,
      body: "{}",
    }),
  );
  const jar = await cookies();
  jar.delete("vam_active_org");
  jar.delete("vam_active_org_name");
  return response;
}

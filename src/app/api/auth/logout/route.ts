import { clearAuthCookie } from "@/lib/auth";

export const runtime = "edge";

export async function POST() {
  await clearAuthCookie();
  return Response.json({ ok: true });
}

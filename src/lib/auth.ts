import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { createServerClient } from "./supabase";
import type { Member } from "@/types";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "fallback-secret-change-me"
);

const COOKIE_NAME = "song-study-token";

export async function createToken(member: Pick<Member, "id" | "name">) {
  const token = await new SignJWT({ sub: member.id, name: member.name })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(JWT_SECRET);
  return token;
}

export async function verifyToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as { sub: string; name: string; iat: number; exp: number };
  } catch {
    return null;
  }
}

export async function getCurrentMember(): Promise<Member | null> {
  const cookieStore = await cookies();
  const tokenCookie = cookieStore.get(COOKIE_NAME);
  if (!tokenCookie) return null;

  const payload = await verifyToken(tokenCookie.value);
  if (!payload) return null;

  const supabase = createServerClient();
  const { data } = await supabase
    .from("members")
    .select("*")
    .eq("id", payload.sub)
    .single();

  return data as Member | null;
}

export async function setAuthCookie(token: string) {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7, // 7 days
  });
}

export async function clearAuthCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

export { COOKIE_NAME };

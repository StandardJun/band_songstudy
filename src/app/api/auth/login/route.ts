import { createServerClient } from "@/lib/supabase";
import { createToken, setAuthCookie } from "@/lib/auth";
import { createHash } from "crypto";

export async function POST(request: Request) {
  try {
    const { name, pin } = await request.json();

    if (!name || !pin) {
      return Response.json(
        { error: "이름과 PIN을 입력해주세요." },
        { status: 400 }
      );
    }

    const supabase = createServerClient();

    // Find member by name
    const { data: member, error } = await supabase
      .from("members")
      .select("*")
      .eq("name", name)
      .single();

    if (error || !member) {
      return Response.json(
        { error: "멤버를 찾을 수 없습니다." },
        { status: 401 }
      );
    }

    // Verify PIN (SHA-256)
    const pinHash = createHash("sha256").update(pin).digest("hex");
    if (pinHash !== member.pin_hash) {
      return Response.json(
        { error: "PIN이 올바르지 않습니다." },
        { status: 401 }
      );
    }

    // Create JWT and set cookie
    const token = await createToken({ id: member.id, name: member.name });

    // Store session in DB
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await supabase.from("sessions").insert({
      member_id: member.id,
      token,
      expires_at: expiresAt.toISOString(),
    });

    await setAuthCookie(token);

    return Response.json({
      member: { id: member.id, name: member.name, color: member.color },
    });
  } catch {
    return Response.json({ error: "로그인 실패" }, { status: 500 });
  }
}

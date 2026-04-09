import { createServerClient } from "@/lib/supabase";
import { getCurrentMember } from "@/lib/auth";

export const runtime = "edge";

export async function PUT(request: Request) {
  const member = await getCurrentMember();
  if (!member) {
    return Response.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  try {
    const { color } = await request.json();

    if (!color || typeof color !== "string" || !/^#[0-9a-fA-F]{6}$/.test(color)) {
      return Response.json(
        { error: "올바른 색상 코드를 입력해주세요." },
        { status: 400 }
      );
    }

    const supabase = createServerClient();

    // Check if another member already uses this color
    const { data: existing } = await supabase
      .from("members")
      .select("id")
      .eq("color", color)
      .neq("id", member.id)
      .limit(1);

    if (existing && existing.length > 0) {
      return Response.json(
        { error: "이미 다른 멤버가 사용 중인 색상입니다." },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from("members")
      .update({ color })
      .eq("id", member.id);

    if (error) {
      return Response.json(
        { error: "색상 변경에 실패했습니다." },
        { status: 500 }
      );
    }

    return Response.json({ ok: true, color });
  } catch {
    return Response.json({ error: "색상 변경 실패" }, { status: 500 });
  }
}

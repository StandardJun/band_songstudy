import { createServerClient } from "@/lib/supabase";
import { getCurrentMember } from "@/lib/auth";

export const runtime = "edge";

async function sha256(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function POST(request: Request) {
  const member = await getCurrentMember();
  if (!member) {
    return Response.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    const { currentPin, newPin } = await request.json();

    if (!currentPin || !newPin) {
      return Response.json(
        { error: "현재 PIN과 새 PIN을 입력해주세요." },
        { status: 400 }
      );
    }

    if (newPin.length < 4) {
      return Response.json(
        { error: "PIN은 4자리 이상이어야 합니다." },
        { status: 400 }
      );
    }

    // Verify current PIN
    const currentHash = await sha256(currentPin);
    if (currentHash !== member.pin_hash) {
      return Response.json(
        { error: "현재 PIN이 올바르지 않습니다." },
        { status: 401 }
      );
    }

    // Update to new PIN
    const newHash = await sha256(newPin);
    const supabase = createServerClient();
    const { error } = await supabase
      .from("members")
      .update({ pin_hash: newHash })
      .eq("id", member.id);

    if (error) {
      return Response.json(
        { error: "PIN 변경에 실패했습니다." },
        { status: 500 }
      );
    }

    return Response.json({ ok: true });
  } catch {
    return Response.json({ error: "PIN 변경 실패" }, { status: 500 });
  }
}

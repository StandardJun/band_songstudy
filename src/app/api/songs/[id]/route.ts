import { createServerClient } from "@/lib/supabase";
import type { NextRequest } from "next/server";

export const runtime = "edge";

// GET /api/songs/[id] — get single song with member info
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = createServerClient();

  const { data: song, error } = await supabase
    .from("songs")
    .select(
      `
      *,
      member:members!uploaded_by(id, name, color)
    `
    )
    .eq("id", id)
    .single();

  if (error || !song) {
    return Response.json({ error: "곡을 찾을 수 없습니다." }, { status: 404 });
  }

  // Get public URL for the audio file
  const {
    data: { publicUrl },
  } = supabase.storage.from("songs").getPublicUrl(song.storage_path);

  return Response.json({ song: { ...song, audio_url: publicUrl } });
}

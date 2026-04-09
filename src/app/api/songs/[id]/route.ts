import { createServerClient } from "@/lib/supabase";
import { getCurrentMember } from "@/lib/auth";
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

// PUT /api/songs/[id] — update song metadata (title, artist, week_number)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const member = await getCurrentMember();
  if (!member) {
    return Response.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const { id } = await params;
  const supabase = createServerClient();

  // Check ownership
  const { data: song } = await supabase
    .from("songs")
    .select("uploaded_by")
    .eq("id", id)
    .single();

  if (!song || song.uploaded_by !== member.id) {
    return Response.json({ error: "본인이 업로드한 곡만 수정할 수 있습니다." }, { status: 403 });
  }

  const { title, artist, week_number } = await request.json();

  const updates: Record<string, unknown> = {};
  if (title) updates.title = title;
  if (artist) updates.artist = artist;
  if (week_number) updates.week_number = parseInt(week_number);

  if (Object.keys(updates).length === 0) {
    return Response.json({ error: "수정할 내용이 없습니다." }, { status: 400 });
  }

  const { error } = await supabase
    .from("songs")
    .update(updates)
    .eq("id", id);

  if (error) {
    return Response.json({ error: "수정 실패" }, { status: 500 });
  }

  return Response.json({ ok: true });
}

// DELETE /api/songs/[id] — delete song + storage file
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const member = await getCurrentMember();
  if (!member) {
    return Response.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const { id } = await params;
  const supabase = createServerClient();

  // Check ownership + get storage path
  const { data: song } = await supabase
    .from("songs")
    .select("uploaded_by, storage_path")
    .eq("id", id)
    .single();

  if (!song || song.uploaded_by !== member.id) {
    return Response.json({ error: "본인이 업로드한 곡만 삭제할 수 있습니다." }, { status: 403 });
  }

  // Delete storage file
  await supabase.storage.from("songs").remove([song.storage_path]);

  // Delete DB record (comments cascade)
  const { error } = await supabase
    .from("songs")
    .delete()
    .eq("id", id);

  if (error) {
    return Response.json({ error: "삭제 실패" }, { status: 500 });
  }

  return Response.json({ ok: true });
}

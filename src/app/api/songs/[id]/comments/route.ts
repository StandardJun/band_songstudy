import { createServerClient } from "@/lib/supabase";
import { getCurrentMember } from "@/lib/auth";
import type { NextRequest } from "next/server";

export const runtime = "edge";

// GET /api/songs/[id]/comments — get all comments with member info
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = createServerClient();

  const { data: comments, error } = await supabase
    .from("comments")
    .select(
      `
      *,
      member:members!member_id(id, name, color)
    `
    )
    .eq("song_id", id)
    .order("time_start", { ascending: true });

  if (error) {
    return Response.json(
      { error: "댓글을 불러올 수 없습니다." },
      { status: 500 }
    );
  }

  return Response.json({ comments: comments ?? [] });
}

// POST /api/songs/[id]/comments — create a comment
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const member = await getCurrentMember();

  if (!member) {
    return Response.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const body = await request.json();
  const { time_start, time_end, content, parent_id } = body;

  if (time_start == null || !content?.trim()) {
    return Response.json(
      { error: "시간과 내용을 입력해주세요." },
      { status: 400 }
    );
  }

  const supabase = createServerClient();

  const { data: comment, error } = await supabase
    .from("comments")
    .insert({
      song_id: id,
      member_id: member.id,
      time_start,
      time_end: time_end ?? null,
      content: content.trim(),
      parent_id: parent_id ?? null,
    })
    .select(
      `
      *,
      member:members!member_id(id, name, color)
    `
    )
    .single();

  if (error) {
    return Response.json(
      { error: "댓글 작성에 실패했습니다." },
      { status: 500 }
    );
  }

  return Response.json({ comment }, { status: 201 });
}

import { createServerClient } from "@/lib/supabase";
import { getCurrentMember } from "@/lib/auth";
import type { NextRequest } from "next/server";

export const runtime = "edge";

// PUT /api/songs/[id]/comments/[commentId] — edit comment content
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; commentId: string }> }
) {
  const { id, commentId } = await params;
  const member = await getCurrentMember();

  if (!member) {
    return Response.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  try {
    const { content } = await request.json();

    if (!content?.trim()) {
      return Response.json({ error: "내용을 입력해주세요." }, { status: 400 });
    }

    const supabase = createServerClient();

    // Verify ownership
    const { data: existing } = await supabase
      .from("comments")
      .select("id, member_id")
      .eq("id", commentId)
      .eq("song_id", id)
      .single();

    if (!existing) {
      return Response.json({ error: "댓글을 찾을 수 없습니다." }, { status: 404 });
    }

    if (existing.member_id !== member.id) {
      return Response.json({ error: "본인의 댓글만 수정할 수 있습니다." }, { status: 403 });
    }

    const { data: updated, error } = await supabase
      .from("comments")
      .update({ content: content.trim() })
      .eq("id", commentId)
      .select(
        `
        *,
        member:members!member_id(id, name, color)
      `
      )
      .single();

    if (error) {
      return Response.json({ error: "수정에 실패했습니다." }, { status: 500 });
    }

    return Response.json({ comment: updated });
  } catch {
    return Response.json({ error: "댓글 수정 실패" }, { status: 500 });
  }
}

// DELETE /api/songs/[id]/comments/[commentId] — delete comment
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; commentId: string }> }
) {
  const { id, commentId } = await params;
  const member = await getCurrentMember();

  if (!member) {
    return Response.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const supabase = createServerClient();

  // Verify ownership
  const { data: existing } = await supabase
    .from("comments")
    .select("id, member_id")
    .eq("id", commentId)
    .eq("song_id", id)
    .single();

  if (!existing) {
    return Response.json({ error: "댓글을 찾을 수 없습니다." }, { status: 404 });
  }

  if (existing.member_id !== member.id) {
    return Response.json({ error: "본인의 댓글만 삭제할 수 있습니다." }, { status: 403 });
  }

  // Delete replies first, then the comment
  await supabase
    .from("comments")
    .delete()
    .eq("parent_id", commentId);

  const { error } = await supabase
    .from("comments")
    .delete()
    .eq("id", commentId);

  if (error) {
    return Response.json({ error: "삭제에 실패했습니다." }, { status: 500 });
  }

  return Response.json({ ok: true });
}

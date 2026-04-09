"use client";

import { useState, useEffect } from "react";
import type { Comment } from "@/types";
import { formatCommentTime } from "@/lib/format";
import CommentForm from "./CommentForm";

interface MemberInfo {
  id: string;
  name: string;
  color: string;
}

interface CommentThreadProps {
  comment: Comment;
  songId: string;
  onTimestampClick: (time: number) => void;
  onRefresh: () => void;
  highlightId?: string | null;
  currentMember?: MemberInfo | null;
}

export default function CommentThread({
  comment,
  songId,
  onTimestampClick,
  onRefresh,
  highlightId,
  currentMember,
}: CommentThreadProps) {
  const [showReplyForm, setShowReplyForm] = useState(false);
  const isHighlighted = highlightId === comment.id;
  const memberColor = comment.member?.color ?? "#6366f1";
  const isOwn = currentMember?.id === comment.member_id;

  // Edit state
  const [editing, setEditing] = useState(false);
  const [editContent, setEditContent] = useState(comment.content);
  const [editLoading, setEditLoading] = useState(false);

  // Delete state
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const timeDisplay = formatCommentTime(comment.time_start, comment.time_end);

  async function handleEdit() {
    if (!editContent.trim() || editLoading) return;
    setEditLoading(true);
    try {
      const res = await fetch(`/api/songs/${songId}/comments/${comment.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: editContent.trim() }),
      });
      if (res.ok) {
        setEditing(false);
        onRefresh();
      }
    } catch {
      // silent
    } finally {
      setEditLoading(false);
    }
  }

  async function handleDelete() {
    setDeleteLoading(true);
    try {
      const res = await fetch(`/api/songs/${songId}/comments/${comment.id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        onRefresh();
      }
    } catch {
      // silent
    } finally {
      setDeleteLoading(false);
      setConfirmDelete(false);
    }
  }

  return (
    <div
      id={`comment-${comment.id}`}
      className={`transition-colors duration-500 ${
        isHighlighted ? "bg-red-100/30 dark:bg-red-900/30" : ""
      }`}
    >
      {/* Main comment */}
      <div
        className="flex gap-3 py-3 px-3 rounded-lg"
        style={{ borderLeft: `3px solid ${memberColor}` }}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            {/* Member badge */}
            <span
              className="text-xs font-medium px-1.5 py-0.5 rounded"
              style={{
                backgroundColor: `${memberColor}20`,
                color: memberColor,
              }}
            >
              {comment.member?.name ?? "알 수 없음"}
            </span>

            {/* Timestamp */}
            {timeDisplay && (
              <button
                onClick={() => comment.time_start != null && onTimestampClick(comment.time_start)}
                className="text-xs text-red-500 dark:text-red-400 hover:text-red-600 dark:hover:text-red-300 font-mono transition-colors"
              >
                {timeDisplay}
              </button>
            )}
          </div>

          {/* Content */}
          {editing ? (
            <div className="space-y-2 mt-1">
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                rows={2}
                className="w-full bg-gray-100 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded px-3 py-2 text-sm text-slate-800 dark:text-slate-200 resize-none focus:outline-none focus:border-red-500"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleEdit();
                  if (e.key === "Escape") { setEditing(false); setEditContent(comment.content); }
                }}
              />
              <div className="flex gap-2">
                <button
                  onClick={handleEdit}
                  disabled={editLoading || !editContent.trim()}
                  className="px-2 py-1 text-xs bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white rounded transition-colors"
                >
                  {editLoading ? "..." : "저장"}
                </button>
                <button
                  onClick={() => { setEditing(false); setEditContent(comment.content); }}
                  className="px-2 py-1 text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                >
                  취소
                </button>
              </div>
            </div>
          ) : (
            <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap break-words">
              {comment.content}
            </p>
          )}

          {/* Actions */}
          {!editing && (
            <div className="flex items-center gap-2 mt-1">
              <button
                onClick={() => setShowReplyForm((v) => !v)}
                className="text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 py-1.5 pr-2 transition-colors"
              >
                {showReplyForm ? "취소" : "답글"}
              </button>
              {isOwn && (
                <>
                  <button
                    onClick={() => { setEditing(true); setEditContent(comment.content); }}
                    className="text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 py-1.5 pr-2 transition-colors"
                  >
                    수정
                  </button>
                  {confirmDelete ? (
                    <span className="flex items-center gap-1">
                      <button
                        onClick={handleDelete}
                        disabled={deleteLoading}
                        className="text-xs text-red-500 hover:text-red-600 py-1.5 pr-1 transition-colors"
                      >
                        {deleteLoading ? "..." : "삭제 확인"}
                      </button>
                      <button
                        onClick={() => setConfirmDelete(false)}
                        className="text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 py-1.5 pr-2 transition-colors"
                      >
                        취소
                      </button>
                    </span>
                  ) : (
                    <button
                      onClick={() => setConfirmDelete(true)}
                      className="text-xs text-slate-500 hover:text-red-400 py-1.5 pr-2 transition-colors"
                    >
                      삭제
                    </button>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Reply form */}
      {showReplyForm && (
        <div className="ml-6 mt-1 mb-2">
          <CommentForm
            songId={songId}
            timeStart={comment.time_start}
            timeEnd={comment.time_end}
            parentId={comment.id}
            onSubmit={() => {
              setShowReplyForm(false);
              onRefresh();
            }}
            onCancel={() => setShowReplyForm(false)}
            placeholder="답글을 입력하세요..."
            compact
          />
        </div>
      )}

      {/* Replies */}
      {comment.replies && comment.replies.length > 0 && (
        <div className="ml-6 space-y-1">
          {comment.replies.map((reply) => (
            <ReplyItem
              key={reply.id}
              reply={reply}
              songId={songId}
              highlightId={highlightId}
              currentMember={currentMember}
              onRefresh={onRefresh}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ReplyItem({
  reply,
  songId,
  highlightId,
  currentMember,
  onRefresh,
}: {
  reply: Comment;
  songId: string;
  highlightId?: string | null;
  currentMember?: MemberInfo | null;
  onRefresh: () => void;
}) {
  const replyColor = reply.member?.color ?? "#6366f1";
  const isReplyHighlighted = highlightId === reply.id;
  const isOwn = currentMember?.id === reply.member_id;

  const [editing, setEditing] = useState(false);
  const [editContent, setEditContent] = useState(reply.content);
  const [editLoading, setEditLoading] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Keep editContent in sync if reply changes
  useEffect(() => {
    setEditContent(reply.content);
  }, [reply.content]);

  async function handleEdit() {
    if (!editContent.trim() || editLoading) return;
    setEditLoading(true);
    try {
      const res = await fetch(`/api/songs/${songId}/comments/${reply.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: editContent.trim() }),
      });
      if (res.ok) {
        setEditing(false);
        onRefresh();
      }
    } catch {
      // silent
    } finally {
      setEditLoading(false);
    }
  }

  async function handleDelete() {
    setDeleteLoading(true);
    try {
      const res = await fetch(`/api/songs/${songId}/comments/${reply.id}`, {
        method: "DELETE",
      });
      if (res.ok) onRefresh();
    } catch {
      // silent
    } finally {
      setDeleteLoading(false);
      setConfirmDelete(false);
    }
  }

  return (
    <div
      id={`comment-${reply.id}`}
      className={`flex gap-3 py-2 px-3 rounded-lg transition-colors duration-500 ${
        isReplyHighlighted ? "bg-red-100/30 dark:bg-red-900/30" : ""
      }`}
      style={{ borderLeft: `2px solid ${replyColor}` }}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span
            className="text-xs font-medium px-1.5 py-0.5 rounded"
            style={{
              backgroundColor: `${replyColor}20`,
              color: replyColor,
            }}
          >
            {reply.member?.name ?? "알 수 없음"}
          </span>
        </div>

        {editing ? (
          <div className="space-y-2 mt-1">
            <textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              rows={1}
              className="w-full bg-gray-100 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded px-3 py-2 text-sm text-slate-800 dark:text-slate-200 resize-none focus:outline-none focus:border-red-500"
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleEdit();
                if (e.key === "Escape") { setEditing(false); setEditContent(reply.content); }
              }}
            />
            <div className="flex gap-2">
              <button
                onClick={handleEdit}
                disabled={editLoading || !editContent.trim()}
                className="px-2 py-1 text-xs bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white rounded transition-colors"
              >
                {editLoading ? "..." : "저장"}
              </button>
              <button
                onClick={() => { setEditing(false); setEditContent(reply.content); }}
                className="px-2 py-1 text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
              >
                취소
              </button>
            </div>
          </div>
        ) : (
          <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap break-words">
            {reply.content}
          </p>
        )}

        {isOwn && !editing && (
          <div className="flex items-center gap-2 mt-1">
            <button
              onClick={() => { setEditing(true); setEditContent(reply.content); }}
              className="text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 py-1 pr-2 transition-colors"
            >
              수정
            </button>
            {confirmDelete ? (
              <span className="flex items-center gap-1">
                <button
                  onClick={handleDelete}
                  disabled={deleteLoading}
                  className="text-xs text-red-500 hover:text-red-600 py-1 pr-1 transition-colors"
                >
                  {deleteLoading ? "..." : "삭제 확인"}
                </button>
                <button
                  onClick={() => setConfirmDelete(false)}
                  className="text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 py-1 pr-2 transition-colors"
                >
                  취소
                </button>
              </span>
            ) : (
              <button
                onClick={() => setConfirmDelete(true)}
                className="text-xs text-slate-500 hover:text-red-400 py-1 pr-2 transition-colors"
              >
                삭제
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

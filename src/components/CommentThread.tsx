"use client";

import { useState } from "react";
import type { Comment } from "@/types";
import { formatCommentTime } from "@/lib/format";
import CommentForm from "./CommentForm";

interface CommentThreadProps {
  comment: Comment;
  songId: string;
  onTimestampClick: (time: number) => void;
  onRefresh: () => void;
  highlightId?: string | null;
}

export default function CommentThread({
  comment,
  songId,
  onTimestampClick,
  onRefresh,
  highlightId,
}: CommentThreadProps) {
  const [showReplyForm, setShowReplyForm] = useState(false);
  const isHighlighted = highlightId === comment.id;
  const memberColor = comment.member?.color ?? "#6366f1";

  return (
    <div
      id={`comment-${comment.id}`}
      className={`transition-colors duration-500 ${
        isHighlighted ? "bg-indigo-900/30" : ""
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
            <button
              onClick={() => onTimestampClick(comment.time_start)}
              className="text-xs text-indigo-400 hover:text-indigo-300 font-mono transition-colors"
            >
              {formatCommentTime(comment.time_start, comment.time_end)}
            </button>
          </div>

          {/* Content */}
          <p className="text-sm text-slate-300 whitespace-pre-wrap break-words">
            {comment.content}
          </p>

          {/* Reply button */}
          <button
            onClick={() => setShowReplyForm((v) => !v)}
            className="text-xs text-slate-500 hover:text-slate-300 mt-1 py-1.5 pr-2 transition-colors"
          >
            {showReplyForm ? "취소" : "답글 달기"}
          </button>
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
          {comment.replies.map((reply) => {
            const replyColor = reply.member?.color ?? "#6366f1";
            const isReplyHighlighted = highlightId === reply.id;

            return (
              <div
                key={reply.id}
                id={`comment-${reply.id}`}
                className={`flex gap-3 py-2 px-3 rounded-lg transition-colors duration-500 ${
                  isReplyHighlighted ? "bg-indigo-900/30" : ""
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
                  <p className="text-sm text-slate-300 whitespace-pre-wrap break-words">
                    {reply.content}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

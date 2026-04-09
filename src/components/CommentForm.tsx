"use client";

import { useState, useEffect } from "react";
import { formatTime, parseTime } from "@/lib/format";

type CommentType = "point" | "range" | "general";

interface CommentFormProps {
  songId: string;
  timeStart: number | null;
  timeEnd: number | null;
  parentId?: string | null;
  onSubmit: () => void;
  onCancel?: () => void;
  placeholder?: string;
  compact?: boolean;
}

export default function CommentForm({
  songId,
  timeStart,
  timeEnd,
  parentId = null,
  onSubmit,
  onCancel,
  placeholder = "댓글을 입력하세요...",
  compact = false,
}: CommentFormProps) {
  const [content, setContent] = useState("");
  const [commentType, setCommentType] = useState<CommentType>(() => {
    if (timeEnd != null) return "range";
    if (timeStart != null) return "point";
    return "general";
  });
  const [manualStart, setManualStart] = useState("");
  const [manualEnd, setManualEnd] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sync manual time display with props
  useEffect(() => {
    if (timeStart != null) {
      setManualStart(formatTime(timeStart));
    }
    if (timeEnd != null) {
      setManualEnd(formatTime(timeEnd));
      setCommentType("range");
    } else if (timeStart != null) {
      setCommentType("point");
    }
  }, [timeStart, timeEnd]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() || submitting) return;

    setError(null);
    setSubmitting(true);

    let finalStart: number | null = null;
    let finalEnd: number | null = null;

    if (commentType === "point") {
      if (!manualStart.trim()) {
        setError("시작 시간을 입력해주세요.");
        setSubmitting(false);
        return;
      }
      const parsed = parseTime(manualStart.trim());
      if (parsed == null) {
        setError("시간 형식이 올바르지 않습니다. (예: 2:30)");
        setSubmitting(false);
        return;
      }
      finalStart = parsed;
      finalEnd = null;
    } else if (commentType === "range") {
      if (!manualStart.trim() || !manualEnd.trim()) {
        setError("시작과 끝 시간을 모두 입력해주세요.");
        setSubmitting(false);
        return;
      }
      const parsedStart = parseTime(manualStart.trim());
      const parsedEnd = parseTime(manualEnd.trim());
      if (parsedStart == null || parsedEnd == null) {
        setError("시간 형식이 올바르지 않습니다. (예: 2:30)");
        setSubmitting(false);
        return;
      }
      finalStart = parsedStart;
      finalEnd = parsedEnd;
    }
    // commentType === "general" => finalStart = null, finalEnd = null

    try {
      const res = await fetch(`/api/songs/${songId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          time_start: finalStart,
          time_end: finalEnd,
          content: content.trim(),
          parent_id: parentId,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "작성 실패");
      }

      setContent("");
      setManualStart("");
      setManualEnd("");
      onSubmit();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "댓글 작성에 실패했습니다.";
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const typeButtons: { key: CommentType; label: string }[] = [
    { key: "point", label: "시점" },
    { key: "range", label: "구간" },
    { key: "general", label: "일반" },
  ];

  return (
    <form onSubmit={handleSubmit} className={compact ? "" : "space-y-2"}>
      {/* Type toggle + time inputs */}
      {!parentId && (
        <div className="space-y-2">
          <div className="flex items-center gap-1">
            {typeButtons.map(({ key, label }) => (
              <button
                key={key}
                type="button"
                onClick={() => setCommentType(key)}
                className={`px-2.5 py-1 text-xs rounded transition-colors ${
                  commentType === key
                    ? "bg-indigo-500 text-white"
                    : "bg-gray-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {commentType === "point" && (
            <div className="flex items-center gap-2">
              <label className="text-xs text-slate-500 dark:text-slate-400 shrink-0">시간</label>
              <input
                type="text"
                value={manualStart}
                onChange={(e) => setManualStart(e.target.value)}
                placeholder="0:00"
                className="bg-gray-100 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded px-2 py-1 text-xs text-slate-700 dark:text-slate-300 w-20 focus:outline-none focus:border-indigo-500"
              />
            </div>
          )}

          {commentType === "range" && (
            <div className="flex items-center gap-2">
              <label className="text-xs text-slate-500 dark:text-slate-400 shrink-0">구간</label>
              <input
                type="text"
                value={manualStart}
                onChange={(e) => setManualStart(e.target.value)}
                placeholder="0:00"
                className="bg-gray-100 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded px-2 py-1 text-xs text-slate-700 dark:text-slate-300 w-20 focus:outline-none focus:border-indigo-500"
              />
              <span className="text-xs text-slate-400">-</span>
              <input
                type="text"
                value={manualEnd}
                onChange={(e) => setManualEnd(e.target.value)}
                placeholder="0:00"
                className="bg-gray-100 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded px-2 py-1 text-xs text-slate-700 dark:text-slate-300 w-20 focus:outline-none focus:border-indigo-500"
              />
            </div>
          )}
        </div>
      )}

      {/* Content input */}
      <div className="flex items-start gap-2">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder={placeholder}
          rows={compact ? 1 : 2}
          className="flex-1 bg-gray-100 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded px-3 py-2 text-sm text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 resize-none focus:outline-none focus:border-indigo-500"
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
              handleSubmit(e);
            }
          }}
        />
        <div className="flex flex-col gap-1">
          <button
            type="submit"
            disabled={!content.trim() || submitting}
            className="px-3 py-2 bg-indigo-500 hover:bg-indigo-600 disabled:bg-gray-200 dark:disabled:bg-slate-700 disabled:text-gray-400 dark:disabled:text-slate-500 text-white text-sm rounded transition-colors"
          >
            {submitting ? "..." : "작성"}
          </button>
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="px-3 py-1 text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
            >
              취소
            </button>
          )}
        </div>
      </div>

      {error && <p className="text-xs text-red-500 dark:text-red-400">{error}</p>}
    </form>
  );
}

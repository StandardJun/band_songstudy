"use client";

import type { Comment } from "@/types";

interface CommentMarkersProps {
  comments: Comment[];
  duration: number;
  onMarkerClick: (commentId: string) => void;
}

export default function CommentMarkers({
  comments,
  duration,
  onMarkerClick,
}: CommentMarkersProps) {
  if (duration <= 0) return null;

  const topLevel = comments.filter((c) => !c.parent_id);

  return (
    <div className="relative h-4 w-full">
      {topLevel.map((comment) => {
        const left = (comment.time_start / duration) * 100;
        const isRange = comment.time_end != null;
        const width = isRange
          ? ((comment.time_end! - comment.time_start) / duration) * 100
          : undefined;

        return (
          <button
            key={comment.id}
            className={`absolute transition-opacity hover:opacity-80 ${
              isRange
                ? "h-2 top-1 rounded-full min-w-[4px]"
                : "h-2 w-2 top-1 rounded-full -translate-x-1"
            }`}
            style={{
              left: `${left}%`,
              width: isRange ? `${Math.max(width!, 0.5)}%` : undefined,
              backgroundColor: comment.member?.color ?? "#6366f1",
            }}
            onClick={() => onMarkerClick(comment.id)}
            title={`${comment.member?.name ?? ""}: ${comment.content.slice(0, 30)}`}
          >
            {/* Invisible touch target overlay (min 44px) */}
            <span className="absolute -inset-x-2 -inset-y-4 min-w-[44px] min-h-[44px]" />
          </button>
        );
      })}
    </div>
  );
}

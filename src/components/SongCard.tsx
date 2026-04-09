import Link from "next/link";
import type { Song } from "@/types";

interface SongCardProps {
  song: Song;
}

export default function SongCard({ song }: SongCardProps) {
  return (
    <Link href={`/songs/${song.id}`}>
      <div className="bg-gray-50 dark:bg-slate-800 rounded-lg p-4 hover:bg-gray-100 dark:hover:bg-slate-750 transition-colors border border-gray-200 dark:border-slate-700 hover:border-gray-300 dark:hover:border-slate-600">
        <div className="flex items-start justify-between">
          <div className="min-w-0 flex-1">
            <h3 className="text-slate-900 dark:text-slate-100 font-semibold truncate">
              {song.title}
            </h3>
            <p className="text-slate-500 dark:text-slate-400 text-sm mt-0.5">{song.artist}</p>
          </div>
          {song.comment_count != null && song.comment_count > 0 && (
            <span className="ml-2 flex-shrink-0 bg-gray-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs px-2 py-1 rounded-full">
              {song.comment_count}
            </span>
          )}
        </div>
        {song.member && (
          <div className="flex items-center mt-3 text-xs text-slate-500">
            <span
              className="w-3 h-3 rounded-full mr-1.5 flex-shrink-0"
              style={{ backgroundColor: song.member.color }}
            />
            <span>{song.member.name}</span>
          </div>
        )}
      </div>
    </Link>
  );
}

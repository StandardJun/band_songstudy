"use client";

import {
  useRef,
  useEffect,
  useState,
  useCallback,
  useImperativeHandle,
  forwardRef,
} from "react";
import WaveSurfer from "wavesurfer.js";
import RegionsPlugin from "wavesurfer.js/dist/plugins/regions.esm.js";
import type { Comment } from "@/types";
import { formatTime } from "@/lib/format";
import CommentMarkers from "./CommentMarkers";

export interface WaveformPlayerHandle {
  seekTo: (time: number) => void;
  getCurrentTime: () => number;
  getDuration: () => number;
}

interface WaveformPlayerProps {
  audioUrl: string;
  comments: Comment[];
  onTimeClick?: (time: number) => void;
  onRegionSelect?: (start: number, end: number) => void;
  onMarkerClick?: (commentId: string) => void;
  onOpenComment?: () => void;
  onRegionModeToggle?: () => void;
  regionMode?: boolean;
}

const WaveformPlayer = forwardRef<WaveformPlayerHandle, WaveformPlayerProps>(
  function WaveformPlayer(
    {
      audioUrl,
      comments,
      onTimeClick,
      onRegionSelect,
      onMarkerClick,
      onOpenComment,
      onRegionModeToggle,
      regionMode = false,
    },
    ref
  ) {
    const containerRef = useRef<HTMLDivElement>(null);
    const wavesurferRef = useRef<WaveSurfer | null>(null);
    const regionsRef = useRef<RegionsPlugin | null>(null);

    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [isReady, setIsReady] = useState(false);
    const [loadError, setLoadError] = useState(false);

    useImperativeHandle(ref, () => ({
      seekTo: (time: number) => {
        wavesurferRef.current?.setTime(time);
      },
      getCurrentTime: () => wavesurferRef.current?.getCurrentTime() ?? 0,
      getDuration: () => wavesurferRef.current?.getDuration() ?? 0,
    }));

    // Initialize WaveSurfer
    useEffect(() => {
      if (!containerRef.current) return;

      const regions = RegionsPlugin.create();
      regionsRef.current = regions;

      const ws = WaveSurfer.create({
        container: containerRef.current,
        height: 64,
        waveColor: "#475569",
        progressColor: "#ef4444",
        cursorColor: "#f87171",
        barWidth: 2,
        barGap: 1,
        barRadius: 2,
        url: audioUrl,
        plugins: [regions],
      });

      wavesurferRef.current = ws;

      ws.on("ready", () => {
        setDuration(ws.getDuration());
        setIsReady(true);
        setLoadError(false);
      });

      ws.on("play", () => setIsPlaying(true));
      ws.on("pause", () => setIsPlaying(false));
      ws.on("timeupdate", (t: number) => setCurrentTime(t));
      ws.on("error", () => setLoadError(true));

      return () => {
        ws.destroy();
      };
    }, [audioUrl]);

    // Region mode toggle
    useEffect(() => {
      const regions = regionsRef.current;
      if (!regions || !isReady) return;

      if (regionMode) {
        regions.enableDragSelection({
          color: "rgba(234, 179, 8, 0.2)",
        });

        const handleRegionCreated = (region: { start: number; end: number }) => {
          onRegionSelect?.(region.start, region.end);
          setTimeout(() => {
            regions.clearRegions();
          }, 100);
        };

        regions.on("region-created", handleRegionCreated);
        return () => {
          regions.un("region-created", handleRegionCreated);
          try {
            regions.clearRegions();
          } catch {
            // ignore
          }
        };
      }
    }, [regionMode, isReady, onRegionSelect]);

    const togglePlay = useCallback(() => {
      wavesurferRef.current?.playPause();
    }, []);

    const skipBack = useCallback(() => {
      const ws = wavesurferRef.current;
      if (ws) ws.setTime(Math.max(0, ws.getCurrentTime() - 5));
    }, []);

    const skipForward = useCallback(() => {
      const ws = wavesurferRef.current;
      if (ws) ws.setTime(Math.min(ws.getDuration(), ws.getCurrentTime() + 5));
    }, []);

    if (loadError) {
      return (
        <div className="bg-gray-50 dark:bg-slate-800 rounded-lg p-6 text-center border border-gray-200 dark:border-slate-700">
          <p className="text-red-500 dark:text-red-400 text-sm mb-3">
            오디오 파일을 불러올 수 없습니다.
          </p>
          <audio controls src={audioUrl} className="mx-auto" />
        </div>
      );
    }

    return (
      <div className="bg-gray-50 dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700/50 overflow-hidden">
        {/* Waveform */}
        <div className="px-4 pt-4 pb-1">
          {!isReady && (
            <div className="h-16 flex items-center justify-center">
              <p className="text-slate-500 text-sm animate-pulse">
                파형 로딩 중...
              </p>
            </div>
          )}
          <div
            ref={containerRef}
            className={isReady ? "" : "opacity-0 h-0 overflow-hidden"}
          />
        </div>

        {/* Comment markers */}
        {isReady && duration > 0 && (
          <div className="px-4">
            <CommentMarkers
              comments={comments}
              duration={duration}
              onMarkerClick={onMarkerClick ?? (() => {})}
            />
          </div>
        )}

        {/* Controls */}
        <div className="px-4 pb-3 pt-1">
          <div className="flex items-center justify-between flex-wrap gap-y-2">
            {/* Playback controls */}
            <div className="flex items-center gap-2">
              <button
                onClick={skipBack}
                className="p-2.5 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
                title="-5초"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path d="M12.066 11.2a1 1 0 000 1.6l5.334 4A1 1 0 0019 16V8a1 1 0 00-1.6-.8l-5.333 4zM4.066 11.2a1 1 0 000 1.6l5.334 4A1 1 0 0011 16V8a1 1 0 00-1.6-.8l-5.334 4z" />
                </svg>
              </button>

              <button
                onClick={togglePlay}
                disabled={!isReady}
                className="p-2 bg-red-500 hover:bg-red-600 disabled:bg-gray-300 dark:disabled:bg-slate-700 rounded-full text-white transition-colors"
              >
                {isPlaying ? (
                  <svg
                    className="w-5 h-5"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M6 4h4v16H6zM14 4h4v16h-4z" />
                  </svg>
                ) : (
                  <svg
                    className="w-5 h-5"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M8 5v14l11-7z" />
                  </svg>
                )}
              </button>

              <button
                onClick={skipForward}
                className="p-2.5 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
                title="+5초"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path d="M11.933 12.8a1 1 0 000-1.6L6.6 7.2A1 1 0 005 8v8a1 1 0 001.6.8l5.333-4zM19.933 12.8a1 1 0 000-1.6l-5.333-4A1 1 0 0013 8v8a1 1 0 001.6.8l5.333-4z" />
                </svg>
              </button>

              <span className="text-xs text-slate-500 dark:text-slate-400 ml-2 tabular-nums">
                {formatTime(currentTime)} / {formatTime(duration)}
              </span>
            </div>

            {/* Comment button */}
            <div className="flex items-center gap-2">
              {regionMode ? (
                <button
                  onClick={onRegionModeToggle}
                  className="px-3 py-2 text-xs bg-yellow-500 hover:bg-yellow-600 text-white rounded transition-colors"
                >
                  구간 선택 중... (취소)
                </button>
              ) : (
                <button
                  onClick={onOpenComment}
                  disabled={!isReady}
                  className="px-3 py-2 text-xs bg-gray-200 dark:bg-slate-700 hover:bg-gray-300 dark:hover:bg-slate-600 disabled:opacity-50 text-slate-700 dark:text-slate-300 rounded transition-colors flex items-center gap-1"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
                  </svg>
                  댓글
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }
);

export default WaveformPlayer;

"use client";

import { useState, useRef } from "react";
import { createBrowserClient } from "@/lib/supabase";
import { compressAudioToMp3, type CompressProgress } from "@/lib/audio-compress";

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUploaded: () => void;
}

export default function UploadModal({
  isOpen,
  onClose,
  onUploaded,
}: UploadModalProps) {
  const [title, setTitle] = useState("");
  const [artist, setArtist] = useState("");
  const [weekNumber, setWeekNumber] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [progress, setProgress] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  function reset() {
    setTitle("");
    setArtist("");
    setWeekNumber("");
    setFile(null);
    setError("");
    if (fileRef.current) fileRef.current.value = "";
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file || !title || !artist || !weekNumber) {
      setError("모든 필드를 입력해주세요.");
      return;
    }

    setLoading(true);
    setError("");
    setProgress(null);

    try {
      // 0. Compress audio if > 10MB
      let uploadFile = file;
      if (file.size > 10 * 1024 * 1024) {
        setProgress("오디오 압축 중...");
        try {
          uploadFile = await compressAudioToMp3(file, (p: CompressProgress) => {
            if (p.stage === "decoding") {
              setProgress("오디오 디코딩 중...");
            } else {
              setProgress(`MP3 변환 중... ${p.percent}%`);
            }
          });
          const savedMB = ((file.size - uploadFile.size) / 1024 / 1024).toFixed(1);
          setProgress(`압축 완료 (${savedMB}MB 절약). 업로드 중...`);
        } catch (compressErr) {
          console.error("Audio compression failed:", compressErr);
          // 압축 실패 시 원본 그대로 업로드 시도
          setProgress("압축 실패 — 원본 파일로 업로드 시도 중...");
          uploadFile = file;
        }
      }

      // 1. Upload file directly to Supabase Storage
      setProgress((prev) => prev?.includes("업로드") ? prev : "업로드 중...");
      const supabase = createBrowserClient();
      const ext = uploadFile.name.split(".").pop() || "mp3";
      const storagePath = `${Date.now()}-${crypto.randomUUID()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("songs")
        .upload(storagePath, uploadFile, {
          contentType: uploadFile.type || "audio/mpeg",
        });

      if (uploadError) {
        setError(`파일 업로드 실패: ${uploadError.message}`);
        return;
      }

      // 2. Save metadata via API
      const res = await fetch("/api/songs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          artist,
          week_number: weekNumber,
          storage_path: storagePath,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "업로드 실패");
        return;
      }

      reset();
      onUploaded();
      onClose();
    } catch {
      setError("네트워크 오류");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white dark:bg-slate-800 rounded-xl w-full max-w-md p-6 border border-gray-200 dark:border-slate-700">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">곡 업로드</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-slate-500 dark:text-slate-400 mb-1">
              오디오 파일
            </label>
            <input
              ref={fileRef}
              type="file"
              accept="audio/*"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="w-full text-sm text-slate-500 dark:text-slate-400 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-gray-100 dark:file:bg-slate-700 file:text-slate-700 dark:file:text-slate-200 file:cursor-pointer hover:file:bg-gray-200 dark:hover:file:bg-slate-600"
            />
          </div>

          <div>
            <label className="block text-sm text-slate-500 dark:text-slate-400 mb-1">제목</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="곡 제목"
              className="w-full bg-gray-100 dark:bg-slate-900 text-slate-900 dark:text-slate-100 py-2 px-3 rounded-lg border border-gray-200 dark:border-slate-700 focus:border-red-500 focus:outline-none text-sm"
            />
          </div>

          <div>
            <label className="block text-sm text-slate-500 dark:text-slate-400 mb-1">
              아티스트
            </label>
            <input
              type="text"
              value={artist}
              onChange={(e) => setArtist(e.target.value)}
              placeholder="아티스트명"
              className="w-full bg-gray-100 dark:bg-slate-900 text-slate-900 dark:text-slate-100 py-2 px-3 rounded-lg border border-gray-200 dark:border-slate-700 focus:border-red-500 focus:outline-none text-sm"
            />
          </div>

          <div>
            <label className="block text-sm text-slate-500 dark:text-slate-400 mb-1">
              주차
            </label>
            <input
              type="number"
              value={weekNumber}
              onChange={(e) => setWeekNumber(e.target.value)}
              placeholder="1"
              min={1}
              className="w-full bg-gray-100 dark:bg-slate-900 text-slate-900 dark:text-slate-100 py-2 px-3 rounded-lg border border-gray-200 dark:border-slate-700 focus:border-red-500 focus:outline-none text-sm"
            />
          </div>

          {error && <p className="text-red-500 dark:text-red-400 text-sm">{error}</p>}
          {loading && progress && (
            <p className="text-slate-500 dark:text-slate-400 text-sm">{progress}</p>
          )}
          {file && file.size > 10 * 1024 * 1024 && !loading && (
            <p className="text-xs text-slate-400">
              {(file.size / 1024 / 1024).toFixed(1)}MB — 업로드 시 MP3 128kbps로 자동 압축됩니다
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-red-500 hover:bg-red-600 disabled:bg-gray-200 dark:disabled:bg-slate-700 disabled:text-gray-400 dark:disabled:text-slate-500 text-white font-medium rounded-lg transition-colors text-sm"
          >
            {loading ? (progress || "업로드 중...") : "업로드"}
          </button>
        </form>
      </div>
    </div>
  );
}

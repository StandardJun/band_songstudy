import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile } from "@ffmpeg/util";

export interface CompressProgress {
  stage: "loading" | "compressing" | "done";
  percent: number;
}

let ffmpeg: FFmpeg | null = null;

async function getFFmpeg(onProgress?: (p: CompressProgress) => void): Promise<FFmpeg> {
  if (ffmpeg && ffmpeg.loaded) return ffmpeg;

  ffmpeg = new FFmpeg();

  ffmpeg.on("progress", ({ progress }) => {
    onProgress?.({
      stage: "compressing",
      percent: Math.round(progress * 100),
    });
  });

  onProgress?.({ stage: "loading", percent: 0 });
  await ffmpeg.load();
  onProgress?.({ stage: "loading", percent: 100 });

  return ffmpeg;
}

/**
 * Compress audio file to MP3 128kbps using ffmpeg.wasm.
 * Handles any audio format (m4a, wav, flac, ogg, etc.)
 */
export async function compressAudioToMp3(
  file: File,
  onProgress?: (p: CompressProgress) => void
): Promise<File> {
  // Small files: skip compression
  if (file.size < 10 * 1024 * 1024) {
    return file;
  }

  const ff = await getFFmpeg(onProgress);

  // Write input file to ffmpeg virtual filesystem
  const inputName = `input.${file.name.split(".").pop() || "m4a"}`;
  const outputName = "output.mp3";

  await ff.writeFile(inputName, await fetchFile(file));

  onProgress?.({ stage: "compressing", percent: 0 });

  // Convert to MP3 128kbps
  await ff.exec([
    "-i", inputName,
    "-vn",           // no video
    "-ar", "44100",  // sample rate
    "-ac", "2",      // stereo
    "-b:a", "128k",  // bitrate
    "-f", "mp3",
    outputName,
  ]);

  // Read output
  const data = await ff.readFile(outputName);

  // Cleanup virtual filesystem
  await ff.deleteFile(inputName);
  await ff.deleteFile(outputName);

  onProgress?.({ stage: "done", percent: 100 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const blob = new Blob([(data as any).buffer ?? data], { type: "audio/mpeg" });
  const baseName = file.name.replace(/\.[^.]+$/, "");
  return new File([blob], `${baseName}.mp3`, { type: "audio/mpeg" });
}

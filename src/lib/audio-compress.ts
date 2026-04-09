// @ts-expect-error lamejs has no type declarations
import lamejs from "lamejs";

export interface CompressProgress {
  stage: "decoding" | "encoding";
  percent: number;
}

/**
 * Compress audio file to MP3 128kbps in the browser.
 * Uses Web Audio API for decoding + lamejs for MP3 encoding.
 */
export async function compressAudioToMp3(
  file: File,
  onProgress?: (p: CompressProgress) => void
): Promise<File> {
  // Already a small file? Skip compression
  if (file.size < 10 * 1024 * 1024) {
    return file;
  }

  onProgress?.({ stage: "decoding", percent: 0 });

  // 1. Decode audio using Web Audio API
  const arrayBuffer = await file.arrayBuffer();
  const audioContext = new AudioContext();
  const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
  await audioContext.close();

  onProgress?.({ stage: "decoding", percent: 100 });

  // 2. Encode to MP3 128kbps
  const channels = audioBuffer.numberOfChannels;
  const sampleRate = audioBuffer.sampleRate;
  const kbps = 128;

  const mp3Encoder = new lamejs.Mp3Encoder(
    channels === 1 ? 1 : 2,
    sampleRate,
    kbps
  );

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mp3Data: any[] = [];
  const sampleBlockSize = 1152;
  const totalSamples = audioBuffer.length;

  // Get PCM data
  const left = audioBuffer.getChannelData(0);
  const right = channels > 1 ? audioBuffer.getChannelData(1) : null;

  // Convert Float32 (-1 to 1) to Int16 (-32768 to 32767)
  const leftInt16 = new Int16Array(totalSamples);
  const rightInt16 = right ? new Int16Array(totalSamples) : null;

  for (let i = 0; i < totalSamples; i++) {
    leftInt16[i] = Math.max(-32768, Math.min(32767, Math.round(left[i] * 32767)));
    if (right && rightInt16) {
      rightInt16[i] = Math.max(-32768, Math.min(32767, Math.round(right[i] * 32767)));
    }
  }

  // Encode in blocks
  for (let i = 0; i < totalSamples; i += sampleBlockSize) {
    const leftChunk = leftInt16.subarray(i, i + sampleBlockSize);
    const rightChunk = rightInt16?.subarray(i, i + sampleBlockSize);

    let mp3buf;
    if (rightChunk) {
      mp3buf = mp3Encoder.encodeBuffer(leftChunk, rightChunk);
    } else {
      mp3buf = mp3Encoder.encodeBuffer(leftChunk);
    }

    if (mp3buf.length > 0) {
      mp3Data.push(mp3buf);
    }

    if (i % (sampleBlockSize * 100) === 0) {
      onProgress?.({
        stage: "encoding",
        percent: Math.round((i / totalSamples) * 100),
      });
    }
  }

  // Flush remaining
  const end = mp3Encoder.flush();
  if (end.length > 0) {
    mp3Data.push(end);
  }

  onProgress?.({ stage: "encoding", percent: 100 });

  // 3. Create File from MP3 data
  const blob = new Blob(mp3Data, { type: "audio/mpeg" });
  const baseName = file.name.replace(/\.[^.]+$/, "");
  return new File([blob], `${baseName}.mp3`, { type: "audio/mpeg" });
}

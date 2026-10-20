"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { requestVideoUpload, saveVideo, type ActionState } from "@/app/actions/admin";
import { MAX_VIDEO_BYTES, VIDEO_TYPES } from "@/lib/constants";

/** PUT straight to R2 with upload progress (fetch has no upload progress events). */
function putWithProgress(url: string, file: File, onProgress: (pct: number) => void) {
  return new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    xhr.setRequestHeader("Content-Type", file.type);
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress(Math.round((e.loaded / e.total) * 100));
    xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(String(xhr.status))));
    xhr.onerror = () => reject(new Error("network"));
    xhr.send(file);
  });
}

/** `portrait`: a 9:16 phone video (preview shape and size hint). */
export function VideoUploader({ slot, src, portrait = false }: { slot: "news" | "home" | "homeMobile"; src: string | null; portrait?: boolean }) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [state, setState] = useState<ActionState>(null);
  const busy = progress !== null;

  async function upload() {
    if (!file) return;
    if (!(file.type in VIDEO_TYPES)) return setState({ ok: false, message: "รองรับเฉพาะไฟล์ MP4 หรือ WebM" });
    if (file.size > MAX_VIDEO_BYTES) return setState({ ok: false, message: `วิดีโอต้องมีขนาดไม่เกิน ${MAX_VIDEO_BYTES / 1024 / 1024} MB` });
    setState(null);
    setProgress(0);
    try {
      const res = await requestVideoUpload({ slot, type: file.type as keyof typeof VIDEO_TYPES, size: file.size });
      if (!res.ok) return setState(res);
      await putWithProgress(res.url, file, setProgress);
      setState(await saveVideo(slot, res.key));
      setFile(null);
      setPreview(null);
      if (input.current) input.current.value = "";
      router.refresh();
    } catch {
      setState({ ok: false, message: "อัปโหลดไม่สำเร็จ กรุณาตรวจสอบอินเทอร์เน็ตแล้วลองใหม่" });
    } finally {
      setProgress(null);
    }
  }

  async function remove() {
    if (!confirm("นำวิดีโอนี้ออก?")) return;
    setProgress(0);
    setState(await saveVideo(slot, null));
    setProgress(null);
    router.refresh();
  }

  return (
    <div className="grid gap-3">
      <div className={`grid place-items-center overflow-hidden rounded-xl bg-primary-50 text-sm ring-1 ring-line ${portrait ? "aspect-[9/16] w-48" : "aspect-video max-w-xl"}`}>
        {file && preview ? (
          <video key={preview} src={preview} controls muted className="size-full bg-ink object-contain" />
        ) : src ? (
          <video key={src} src={src} controls preload="metadata" className="size-full bg-ink object-contain" />
        ) : (
          "ยังไม่มีวิดีโอ"
        )}
      </div>
      <input
        ref={input}
        type="file"
        accept="video/mp4,video/webm"
        disabled={busy}
        onChange={(e) => {
          const f = e.target.files?.[0] ?? null;
          if (preview) URL.revokeObjectURL(preview);
          setFile(f);
          setPreview(f ? URL.createObjectURL(f) : null);
        }}
        className="block w-full max-w-xl cursor-pointer text-xs file:mr-3 file:cursor-pointer file:rounded-full file:border-0 file:bg-primary-50 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-primary hover:file:bg-primary hover:file:text-white"
      />
      <p className="text-xs">MP4 หรือ WebM ไม่เกิน {MAX_VIDEO_BYTES / 1024 / 1024} MB · แนะนำ {portrait ? "1080×1920 (แนวตั้ง 9:16)" : "1920×1080 (แนวนอน 16:9)"} H.264</p>
      {progress !== null && file && (
        <div className="h-2 max-w-xl overflow-hidden rounded-full bg-primary-50" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}>
          <div className="h-full bg-primary transition-[width]" style={{ width: `${progress}%` }} />
        </div>
      )}
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" onClick={upload} disabled={busy || !file} className="btn-primary btn-sm">
          {busy && file ? `กำลังอัปโหลด ${progress}%` : "อัปโหลดวิดีโอ"}
        </button>
        {src && !file && (
          <button type="button" onClick={remove} disabled={busy} className="btn btn-sm border-red-200 bg-white text-red-600 hover:bg-red-50">
            นำวิดีโอออก
          </button>
        )}
        {state && <p role="status" className={`text-sm ${state.ok ? "text-emerald-700" : "text-red-600"}`}>{state.message}</p>}
      </div>
    </div>
  );
}

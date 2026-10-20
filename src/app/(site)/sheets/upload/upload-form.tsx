"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { requestUploadUrls, submitSheet } from "@/app/actions/upload";
import {
  ACADEMIC_YEARS,
  DESCRIPTION_MAX,
  GRADES,
  MAX_FILE_BYTES,
  MAX_FILES,
  MAX_TOTAL_BYTES,
  SEMESTERS,
  SUBJECTS,
  TITLE_MAX,
  type AcceptedMime,
} from "@/lib/constants";
import { formatBytes } from "@/lib/format";

type Item = { id: string; file: File; type: AcceptedMime; preview: string | null; progress: number };
type Phase = "idle" | "uploading" | "processing" | "done";

function detectType(f: File): AcceptedMime | null {
  if (f.type === "application/pdf" || f.type === "image/png" || f.type === "image/jpeg") return f.type;
  const ext = f.name.split(".").pop()?.toLowerCase();
  if (ext === "pdf") return "application/pdf";
  if (ext === "png") return "image/png";
  if (ext === "jpg" || ext === "jpeg") return "image/jpeg";
  return null;
}

/** PUT a file to a presigned R2 URL, reporting progress (fetch has no upload progress). */
function putWithProgress(url: string, file: File, type: string, onProgress: (p: number) => void) {
  return new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    xhr.setRequestHeader("Content-Type", type);
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress(e.loaded / e.total);
    xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(`HTTP ${xhr.status}`)));
    xhr.onerror = () => reject(new Error("network"));
    xhr.send(file);
  });
}

export function UploadForm({ userName }: { userName: string }) {
  const [items, setItems] = useState<Item[]>([]);
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [subjectId, setSubjectId] = useState("");
  const [grade, setGrade] = useState("");
  const [descLen, setDescLen] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const uid = useId();

  // Revoke thumbnail URLs when the component goes away
  const itemsRef = useRef(items);
  useEffect(() => {
    itemsRef.current = items;
  }, [items]);
  useEffect(() => () => itemsRef.current.forEach((i) => i.preview && URL.revokeObjectURL(i.preview)), []);

  const busy = phase === "uploading" || phase === "processing";
  const totalBytes = items.reduce((s, i) => s + i.file.size, 0);
  const allowedGrades = SUBJECTS.find((s) => s.id === subjectId)?.levels;

  function addFiles(list: FileList | File[]) {
    setError(null);
    const next: Item[] = [];
    const problems: string[] = [];
    for (const file of Array.from(list)) {
      const type = detectType(file);
      if (!type) problems.push(`${file.name}: รองรับเฉพาะ PDF, PNG, JPG`);
      else if (file.size > MAX_FILE_BYTES) problems.push(`${file.name}: ใหญ่เกิน ${formatBytes(MAX_FILE_BYTES)}`);
      else if (file.size === 0) problems.push(`${file.name}: ไฟล์ว่าง`);
      else
        next.push({
          id: crypto.randomUUID(),
          file,
          type,
          preview: type === "application/pdf" ? null : URL.createObjectURL(file),
          progress: 0,
        });
    }
    setItems((prev) => {
      const merged = [...prev, ...next];
      if (merged.length > MAX_FILES) problems.push(`อัปโหลดได้สูงสุด ${MAX_FILES} ไฟล์`);
      merged.slice(MAX_FILES).forEach((i) => i.preview && URL.revokeObjectURL(i.preview));
      return merged.slice(0, MAX_FILES);
    });
    if (problems.length) setError(problems.join("\n"));
  }

  function remove(id: string) {
    setItems((prev) => {
      const it = prev.find((i) => i.id === id);
      if (it?.preview) URL.revokeObjectURL(it.preview);
      return prev.filter((i) => i.id !== id);
    });
  }

  function move(index: number, dir: -1 | 1) {
    setItems((prev) => {
      const j = index + dir;
      if (j < 0 || j >= prev.length) return prev;
      const copy = [...prev];
      [copy[index], copy[j]] = [copy[j], copy[index]];
      return copy;
    });
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    setError(null);
    const fd = new FormData(e.currentTarget);

    if (!items.length) return setError("กรุณาเลือกไฟล์อย่างน้อย 1 ไฟล์");
    if (totalBytes > MAX_TOTAL_BYTES) return setError(`ขนาดไฟล์รวมต้องไม่เกิน ${formatBytes(MAX_TOTAL_BYTES)}`);

    setPhase("uploading");
    try {
      const presign = await requestUploadUrls(items.map((i) => ({ name: i.file.name, type: i.type, size: i.file.size })));
      if (!presign.ok) throw new Error(presign.error);

      // Upload up to 3 files at a time
      const queue = items.map((item, idx) => ({ item, target: presign.uploads[idx] }));
      const worker = async () => {
        for (let job = queue.shift(); job; job = queue.shift()) {
          const { item, target } = job;
          await putWithProgress(target.url, item.file, item.type, (p) =>
            setItems((prev) => prev.map((x) => (x.id === item.id ? { ...x, progress: p } : x))),
          ).catch(() => {
            throw new Error(`อัปโหลด ${item.file.name} ไม่สำเร็จ กรุณาตรวจสอบอินเทอร์เน็ตแล้วลองใหม่`);
          });
        }
      };
      await Promise.all([worker(), worker(), worker()]);

      setPhase("processing");
      const res = await submitSheet({
        keys: presign.uploads.map((u) => u.key),
        title: String(fd.get("title") ?? ""),
        description: String(fd.get("description") ?? ""),
        subjectId: String(fd.get("subjectId") ?? ""),
        grade: String(fd.get("grade") ?? "") as never,
        semester: String(fd.get("semester") ?? ""),
        academicYear: String(fd.get("academicYear") ?? ""),
      });
      if (!res.ok) throw new Error(res.error);
      setPhase("done");
    } catch (err) {
      setItems((prev) => prev.map((x) => ({ ...x, progress: 0 })));
      setError(err instanceof Error ? err.message : "เกิดข้อผิดพลาด กรุณาลองใหม่");
      setPhase("idle");
    }
  }

  if (phase === "done") {
    return (
      <div className="card mt-8 p-8 text-center sm:p-12">
        <div className="mx-auto mb-5 grid size-16 place-items-center rounded-full bg-emerald-100 text-emerald-600">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="size-8" aria-hidden><path d="m5 12 5 5 9-10" /></svg>
        </div>
        <h2 className="text-2xl font-bold">ส่งชีทแล้ว ขอบคุณ {userName}!</h2>
        <p className="mx-auto mt-2 max-w-md">ชีทจะขึ้นหน้าเว็บหลังผู้ดูแลตรวจ ติดตามสถานะได้ที่ “ชีทของฉัน”</p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link href="/my-sheets" className="btn-primary">ดูชีทของฉัน</Link>
          <button type="button" className="btn-outline" onClick={() => { setItems([]); setDescLen(0); setPhase("idle"); }}>
            ส่งอีกชีท
          </button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="mt-8 grid gap-6" noValidate={false}>
      {/* 1. Files */}
      <section className="card p-6 sm:p-8">
        <h2 className="mb-1 text-lg font-semibold">1. ไฟล์ชีทสรุป</h2>
        <p className="mb-5 text-sm">
          PDF, PNG หรือ JPG สูงสุด {MAX_FILES} ไฟล์ รวมไม่เกิน {formatBytes(MAX_TOTAL_BYTES)}
        </p>

        <div
          role="button"
          tabIndex={0}
          aria-label="เลือกไฟล์หรือวางไฟล์ที่นี่"
          onClick={() => !busy && inputRef.current?.click()}
          onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && !busy && (e.preventDefault(), inputRef.current?.click())}
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => { e.preventDefault(); setDragging(false); if (!busy) addFiles(e.dataTransfer.files); }}
          className={`grid cursor-pointer place-items-center rounded-2xl border-2 border-dashed px-6 py-10 text-center transition ${
            dragging ? "border-primary bg-primary-50" : "border-line hover:border-primary/50 hover:bg-primary-50/50"
          } ${busy ? "pointer-events-none opacity-60" : ""}`}
        >
          <div className="mb-3 grid size-14 place-items-center rounded-full bg-primary-50 text-primary">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="size-7" aria-hidden>
              <path d="M12 16V4m0 0-4 4m4-4 4 4M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
            </svg>
          </div>
          <p className="font-medium text-ink">ลากไฟล์มาวาง หรือ <span className="text-primary underline underline-offset-4">คลิกเพื่อเลือกไฟล์</span></p>
          <p className="mt-1 text-xs">เลือกได้หลายไฟล์ ระบบจะรวมเป็น PDF ไฟล์เดียว</p>
          <input
            ref={inputRef}
            type="file"
            multiple
            accept=".pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg"
            className="sr-only"
            tabIndex={-1}
            onChange={(e) => { if (e.target.files) addFiles(e.target.files); e.target.value = ""; }}
          />
        </div>

        {items.length > 0 && (
          <>
            <div className="mt-5 mb-2 flex items-center justify-between text-sm">
              <p className="font-medium text-ink">ลำดับหน้า ({items.length} ไฟล์ · {formatBytes(totalBytes)})</p>
            </div>
            <ol className="space-y-2">
              {items.map((it, i) => (
                <li key={it.id} className="relative flex items-center gap-3 overflow-hidden rounded-xl bg-white p-2.5 ring-1 ring-line">
                  {it.progress > 0 && (
                    <span className="absolute inset-y-0 left-0 bg-primary/8 transition-[width]" style={{ width: `${it.progress * 100}%` }} aria-hidden />
                  )}
                  <span className="relative w-6 text-center text-sm font-semibold text-primary">{i + 1}</span>
                  {it.preview ? (
                    <img src={it.preview} alt="" className="relative size-12 rounded-lg object-cover ring-1 ring-line" />
                  ) : (
                    <span className="relative grid size-12 place-items-center rounded-lg bg-red-50 text-xs font-bold text-red-600 ring-1 ring-red-100">PDF</span>
                  )}
                  <div className="relative min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-ink">{it.file.name}</p>
                    <p className="text-xs">{formatBytes(it.file.size)}{it.progress > 0 && ` · ${Math.round(it.progress * 100)}%`}</p>
                  </div>
                  <div className="relative flex gap-1">
                    <IconBtn label="เลื่อนขึ้น" disabled={busy || i === 0} onClick={() => move(i, -1)} d="m6 15 6-6 6 6" />
                    <IconBtn label="เลื่อนลง" disabled={busy || i === items.length - 1} onClick={() => move(i, 1)} d="m6 9 6 6 6-6" />
                    <IconBtn label="ลบไฟล์" disabled={busy} onClick={() => remove(it.id)} d="M6 6l12 12M18 6 6 18" danger />
                  </div>
                </li>
              ))}
            </ol>
          </>
        )}
      </section>

      {/* 2. Details */}
      <section className="card grid gap-5 p-6 sm:grid-cols-2 sm:p-8">
        <h2 className="text-lg font-semibold sm:col-span-2">2. รายละเอียดชีท</h2>

        <div className="sm:col-span-2">
          <label htmlFor={`${uid}-title`} className="field-label">ชื่อชีท</label>
          <input id={`${uid}-title`} name="title" required minLength={3} maxLength={TITLE_MAX} className="field" placeholder="เช่น สรุปเรื่องเซตและตรรกศาสตร์" disabled={busy} />
        </div>

        <div>
          <label htmlFor={`${uid}-subject`} className="field-label">วิชา</label>
          <select
            id={`${uid}-subject`}
            name="subjectId"
            required
            className="field"
            value={subjectId}
            disabled={busy}
            onChange={(e) => {
              setSubjectId(e.target.value);
              const levels = SUBJECTS.find((s) => s.id === e.target.value)?.levels;
              if (levels && grade && !levels.includes(grade as never)) setGrade("");
            }}
          >
            <option value="" disabled>เลือกวิชา</option>
            {SUBJECTS.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>

        <div>
          <label htmlFor={`${uid}-grade`} className="field-label">ระดับชั้น</label>
          <select id={`${uid}-grade`} name="grade" required className="field" value={grade} onChange={(e) => setGrade(e.target.value)} disabled={busy}>
            <option value="" disabled>เลือกระดับชั้น</option>
            {GRADES.filter((g) => !allowedGrades || allowedGrades.includes(g.value)).map((g) => (
              <option key={g.value} value={g.value}>{g.full}</option>
            ))}
          </select>
        </div>

        <fieldset>
          <legend className="field-label">ภาคเรียน</legend>
          <div className="flex gap-3">
            {SEMESTERS.map((s) => (
              <label key={s} className="flex-1 cursor-pointer">
                <input type="radio" name="semester" value={s} required className="peer sr-only" disabled={busy} />
                <span className="block rounded-xl border border-line py-2.5 text-center font-medium text-ink transition peer-checked:border-primary peer-checked:bg-primary peer-checked:text-white peer-focus-visible:ring-4 peer-focus-visible:ring-primary/20">
                  ภาคเรียนที่ {s}
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        <div>
          <label htmlFor={`${uid}-year`} className="field-label">ปีการศึกษา</label>
          <select id={`${uid}-year`} name="academicYear" required className="field" defaultValue={ACADEMIC_YEARS[0]} disabled={busy}>
            {ACADEMIC_YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>

        <div className="sm:col-span-2">
          <label htmlFor={`${uid}-desc`} className="field-label">คำอธิบาย</label>
          <textarea
            id={`${uid}-desc`}
            name="description"
            required
            minLength={10}
            maxLength={DESCRIPTION_MAX}
            rows={3}
            className="field resize-y"
            placeholder="สรุปเนื้อหาเรื่องอะไรบ้าง สั้น ๆ"
            onChange={(e) => setDescLen(e.target.value.length)}
            disabled={busy}
          />
          <p className="mt-1 text-right text-xs">{descLen}/{DESCRIPTION_MAX}</p>
        </div>
      </section>

      {error && (
        <p role="alert" className="whitespace-pre-line rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-red-200">{error}</p>
      )}

      <div className="flex flex-col-reverse items-stretch gap-3 sm:flex-row sm:items-center sm:justify-end">
        <p className="text-center text-xs sm:mr-auto sm:text-left">
          กดส่ง = ยืนยันว่าคุณเป็นเจ้าของเนื้อหา หรือได้รับอนุญาตให้เผยแพร่
        </p>
        <button type="submit" className="btn-primary min-w-[220px]" disabled={busy}>
          {phase === "uploading" && <Spinner />}
          {phase === "processing" && <Spinner />}
          {phase === "uploading" ? "กำลังอัปโหลดไฟล์…" : phase === "processing" ? "กำลังรวมไฟล์เป็น PDF…" : "ส่งชีทสรุป"}
        </button>
      </div>
    </form>
  );
}

function IconBtn({ label, d, onClick, disabled, danger }: { label: string; d: string; onClick: () => void; disabled?: boolean; danger?: boolean }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
      className={`grid size-8 cursor-pointer place-items-center rounded-lg transition disabled:cursor-default disabled:opacity-30 ${danger ? "text-red-500 hover:bg-red-50" : "text-ink hover:bg-primary-50"}`}
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="size-4" aria-hidden><path d={d} /></svg>
    </button>
  );
}

export function Spinner() {
  return <span className="size-4 animate-spin rounded-full border-2 border-white/40 border-t-white" aria-hidden />;
}

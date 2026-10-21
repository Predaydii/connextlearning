"use client";

import { useActionState, useState, useTransition } from "react";
import { deleteNewsPost, saveNewsPost, type ActionState } from "@/app/actions/admin";
import { shrinkInForm } from "@/lib/shrink-image";
import { NEWS_CATEGORIES } from "@/lib/constants";
import { ImagePick } from "@/components/admin/image-pick";

function Notice({ state }: { state: ActionState }) {
  if (!state) return null;
  return (
    <p role="status" className={`text-sm ${state.ok ? "text-emerald-700" : "text-red-600"}`}>
      {state.message}
    </p>
  );
}


export type NewsFormPost = {
  id: string;
  title: string;
  summary: string;
  linkUrl: string | null;
  category: string | null;
  image: string | null;
  publishedAt: string; // YYYY-MM-DD
};

export function NewsPostForm({ post, onDone }: { post?: NewsFormPost; onDone?: () => void }) {
  const [state, action, pending] = useActionState(async (prev: ActionState, fd: FormData) => {
    // Shrink big photos in the browser first (Vercel refuses bodies over 4.5 MB)
    const err = await shrinkInForm(fd);
    if (err) return { ok: false, message: err };
    const res = await saveNewsPost(prev, fd);
    if (res?.ok) onDone?.();
    return res;
  }, null);
  const [preview, setPreview] = useState<string | null>(null);
  const [removeImage, setRemoveImage] = useState(false);
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Bangkok" });

  return (
    // Without a post the form resets after a successful save (React resets uncontrolled forms on action)
    <form action={action} onSubmit={() => setPreview(null)} className="grid gap-4 md:grid-cols-[minmax(0,1fr)_16rem]">
      {post && <input type="hidden" name="id" value={post.id} />}
      {removeImage && <input type="hidden" name="removeImage" value="1" />}
      <div className="grid content-start gap-3">
        <label className="grid gap-1 text-sm font-medium text-ink">
          หัวข้อข่าว
          <input name="title" required maxLength={150} defaultValue={post?.title} className="field" />
        </label>
        <label className="grid gap-1 text-sm font-medium text-ink">
          รายละเอียด
          <textarea name="summary" required maxLength={1000} rows={4} defaultValue={post?.summary} className="field" />
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="grid gap-1 text-sm font-medium text-ink">
            หมวดหมู่
            <select name="category" required defaultValue={post?.category ?? ""} className="field">
              <option value="" disabled>เลือกหมวดหมู่</option>
              {NEWS_CATEGORIES.map((c) => <option key={c}>{c}</option>)}
            </select>
          </label>
          <label className="grid gap-1 text-sm font-medium text-ink">
            วันที่
            <input name="publishedAt" type="date" required defaultValue={post?.publishedAt ?? today} className="field" />
          </label>
        </div>
        <div className="grid gap-3">
          <label className="grid gap-1 text-sm font-medium text-ink">
            ลิงก์แนะนำ (ไม่บังคับ)
            <input name="linkUrl" type="url" maxLength={500} defaultValue={post?.linkUrl ?? ""} placeholder="https://" className="field" />
          </label>
        </div>
      </div>
      <div className="grid content-start gap-2">
        <span className="text-sm font-medium text-ink">ภาพประกอบ 4:5 (ไม่บังคับ)</span>
        <ImagePick
          key={removeImage ? "removed" : "kept"}
          src={removeImage ? null : (post?.image ?? null)}
          aspect="aspect-[4/5]"
          onPick={(files) => {
            setPreview(files[0] ? "picked" : null);
            if (files[0]) setRemoveImage(false);
          }}
        />
        {post?.image && !preview && (
          <label className="flex items-center gap-2 text-xs">
            <input type="checkbox" checked={removeImage} onChange={(e) => setRemoveImage(e.target.checked)} />
            นำภาพออก
          </label>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-3 md:col-span-2">
        <button disabled={pending} className="btn-primary btn-sm">
          {pending ? "กำลังบันทึก…" : post ? "บันทึกการแก้ไข" : "เพิ่มข่าว"}
        </button>
        {onDone && (
          <button type="button" onClick={onDone} className="btn-outline btn-sm">
            ยกเลิก
          </button>
        )}
        <Notice state={state} />
      </div>
    </form>
  );
}

export function NewsPostRow({ post, date }: { post: NewsFormPost; date: string }) {
  const [editing, setEditing] = useState(false);
  const [state, setState] = useState<ActionState>(null);
  const [deleting, startDelete] = useTransition();

  if (editing) {
    return (
      <li className="rounded-2xl bg-primary-50/60 p-4 ring-1 ring-line">
        <NewsPostForm post={post} onDone={() => setEditing(false)} />
      </li>
    );
  }
  return (
    <li className="flex flex-col gap-4 rounded-2xl p-4 ring-1 ring-line sm:flex-row sm:items-center">
      <div className="aspect-[4/5] w-32 shrink-0 overflow-hidden rounded-xl bg-primary-50 sm:w-28">
        {post.image && <img src={post.image} alt="" className="size-full object-cover" />}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs">{date}{post.category ? ` · ${post.category}` : ""}</p>
        <p className="font-semibold text-ink">{post.title}</p>
        <p className="line-clamp-2 text-sm">{post.summary}</p>
        <Notice state={state} />
      </div>
      <div className="flex gap-2">
        <button type="button" onClick={() => setEditing(true)} className="btn-outline btn-sm">
          แก้ไข
        </button>
        <button
          type="button"
          disabled={deleting}
          onClick={() => {
            if (!confirm(`ลบข่าว "${post.title}" ?`)) return;
            startDelete(async () => setState(await deleteNewsPost(post.id)));
          }}
          className="btn btn-sm border-red-200 bg-white text-red-600 hover:bg-red-50"
        >
          {deleting ? "กำลังลบ…" : "ลบ"}
        </button>
      </div>
    </li>
  );
}

"use client";

import { useActionState, useState, useTransition } from "react";
import { addNewsCategory, deleteNewsCategory, deleteNewsPost, renameNewsCategory, saveNewsPost, type ActionState } from "@/app/actions/admin";
import { shrinkInForm } from "@/lib/shrink-image";
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
  linkLabel: string | null;
  category: string | null;
  image: string | null;
  publishedAt: string; // YYYY-MM-DD
};

export function NewsPostForm({ post, categories, onDone }: { post?: NewsFormPost; categories: string[]; onDone?: () => void }) {
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
          รายละเอียด <span className="font-normal text-body">(ไม่บังคับ)</span>
          <textarea name="summary" maxLength={1000} rows={4} defaultValue={post?.summary} className="field" />
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="grid gap-1 text-sm font-medium text-ink">
            หมวดหมู่
            <select name="category" defaultValue={post?.category ?? ""} className="field">
              <option value="">ไม่ระบุ</option>
              {categories.map((c) => <option key={c}>{c}</option>)}
            </select>
          </label>
          <label className="grid gap-1 text-sm font-medium text-ink">
            วันที่
            <input name="publishedAt" type="date" required defaultValue={post?.publishedAt ?? today} className="field" />
          </label>
        </div>
        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_13rem]">
          <label className="grid gap-1 text-sm font-medium text-ink">
            ลิงก์ในปุ่ม <span className="font-normal text-body">(ไม่บังคับ)</span>
            <input name="linkUrl" type="url" maxLength={500} defaultValue={post?.linkUrl ?? ""} placeholder="https://" className="field" />
          </label>
          <label className="grid gap-1 text-sm font-medium text-ink">
            ชื่อปุ่ม
            <input name="linkLabel" maxLength={40} defaultValue={post?.linkLabel ?? ""} placeholder="รายละเอียดเพิ่มเติม" className="field" />
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

export function NewsPostRow({ post, date, categories }: { post: NewsFormPost; date: string; categories: string[] }) {
  const [editing, setEditing] = useState(false);
  const [state, setState] = useState<ActionState>(null);
  const [deleting, startDelete] = useTransition();

  if (editing) {
    return (
      <li className="rounded-2xl bg-primary-50/60 p-4 ring-1 ring-line">
        <NewsPostForm post={post} categories={categories} onDone={() => setEditing(false)} />
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

/** Admins add, rename and delete news categories (renaming updates the news that use it). */
export function NewsCategoryManager({ categories }: { categories: { id: string; name: string; count: number }[] }) {
  const [state, action, pending] = useActionState(addNewsCategory, null);
  return (
    <div className="grid gap-4">
      <ul className="flex flex-wrap gap-2">
        {categories.map((c) => <CategoryChip key={`${c.id}-${c.name}`} category={c} />)}
        {categories.length === 0 && <li className="text-sm">ยังไม่มีหมวดหมู่</li>}
      </ul>
      <form action={action} className="flex max-w-md gap-2">
        <input name="name" required maxLength={40} placeholder="ชื่อหมวดหมู่ใหม่" className="field min-w-0 flex-1 py-2 text-sm" />
        <button disabled={pending} className="btn-primary btn-sm">{pending ? "กำลังเพิ่ม…" : "เพิ่มหมวดหมู่"}</button>
      </form>
      <Notice state={state} />
    </div>
  );
}

function CategoryChip({ category }: { category: { id: string; name: string; count: number } }) {
  const [editing, setEditing] = useState(false);
  const [state, setState] = useState<ActionState>(null);
  const [pending, start] = useTransition();
  if (editing) {
    return (
      <li>
        <form
          className="flex items-center gap-1.5 rounded-full bg-white p-1 ring-1 ring-primary"
          onSubmit={(e) => {
            e.preventDefault();
            const name = String(new FormData(e.currentTarget).get("name") ?? "");
            start(async () => {
              const res = await renameNewsCategory(category.id, name);
              setState(res);
              if (!res || res.ok) setEditing(false);
            });
          }}
        >
          <input name="name" defaultValue={category.name} maxLength={40} autoFocus className="w-36 rounded-full px-3 py-1 text-sm outline-none" />
          <button disabled={pending} className="rounded-full bg-primary px-3 py-1 text-xs font-semibold text-white">บันทึก</button>
          <button type="button" onClick={() => setEditing(false)} className="rounded-full px-2 py-1 text-xs">ยกเลิก</button>
        </form>
        {state && !state.ok && <p className="mt-1 text-xs text-red-600">{state.message}</p>}
      </li>
    );
  }
  return (
    <li className="flex items-center gap-1 rounded-full bg-primary-50 py-1 pr-1 pl-3 text-sm text-ink ring-1 ring-line">
      <button type="button" onClick={() => setEditing(true)} title="คลิกเพื่อเปลี่ยนชื่อ" className="cursor-pointer font-medium hover:text-primary">
        {category.name} <span className="text-xs text-body">({category.count})</span>
      </button>
      <button
        type="button"
        aria-label={`ลบหมวดหมู่ ${category.name}`}
        disabled={pending}
        onClick={() => {
          if (!confirm(`ลบหมวดหมู่ "${category.name}"? ข่าวในหมวดนี้จะไม่มีหมวดหมู่`)) return;
          start(async () => setState(await deleteNewsCategory(category.id)));
        }}
        className="grid size-6 cursor-pointer place-items-center rounded-full text-body transition hover:bg-red-100 hover:text-red-600"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className="size-3.5" aria-hidden><path d="M6 6l12 12M18 6 6 18" /></svg>
      </button>
    </li>
  );
}

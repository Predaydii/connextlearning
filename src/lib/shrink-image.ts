/**
 * Browser-side: scale an image down to at most `maxW` px wide and re-encode it
 * (WebP, or JPEG where WebP encoding is missing) before it is posted to a server
 * action. Vercel rejects request bodies over 4.5 MB before they reach the app, so a
 * large photo would otherwise fail with a blank error page. The server still crops
 * and converts it.
 */
export const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;

export async function shrinkImage(file: File, maxW = 2400, quality = 0.88): Promise<File> {
  if (!file.type.startsWith("image/")) return file;
  let bmp: ImageBitmap;
  try {
    bmp = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    return file; // unreadable here: let the server decide
  }
  const scale = Math.min(1, maxW / bmp.width);
  if (scale === 1 && file.size <= 1.5 * 1024 * 1024) {
    bmp.close();
    return file;
  }
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bmp.width * scale);
  canvas.height = Math.round(bmp.height * scale);
  canvas.getContext("2d")!.drawImage(bmp, 0, 0, canvas.width, canvas.height);
  bmp.close();
  const encode = (type: string) => new Promise<Blob | null>((r) => canvas.toBlob(r, type, quality));
  let blob = await encode("image/webp");
  if (!blob || blob.type !== "image/webp") blob = await encode("image/jpeg");
  if (!blob) return file;
  const ext = blob.type === "image/webp" ? "webp" : "jpg";
  return new File([blob], file.name.replace(/\.[^.]+$/, "") + "." + ext, { type: blob.type });
}

/** Replace the image at `name` in `fd` with its shrunk version; returns an error message or null. */
export async function shrinkInForm(fd: FormData, name = "file"): Promise<string | null> {
  const f = fd.get(name);
  if (!(f instanceof File) || f.size === 0) return null;
  const small = await shrinkImage(f);
  if (small.size > MAX_UPLOAD_BYTES) return "รูปภาพใหญ่เกินไป กรุณาใช้รูปที่เล็กกว่านี้";
  fd.set(name, small);
  return null;
}

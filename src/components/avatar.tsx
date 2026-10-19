const PALETTE = ["#203cc7", "#03a0db", "#7c3aed", "#0f9d58", "#f97316", "#db2777"];

/** Google profile photo, or a coloured initial when there is none. */
export function Avatar({ name, image, size = 32 }: { name: string; image?: string | null; size?: number }) {
  if (image) {
    return (
      <img
        src={image}
        alt=""
        width={size}
        height={size}
        referrerPolicy="no-referrer"
        loading="lazy"
        className="shrink-0 rounded-full bg-primary-50 object-cover"
        style={{ width: size, height: size }}
      />
    );
  }
  const initial = name.trim().charAt(0).toUpperCase() || "?";
  const color = PALETTE[[...name].reduce((a, c) => a + c.charCodeAt(0), 0) % PALETTE.length];
  return (
    <span
      aria-hidden
      className="grid shrink-0 place-items-center rounded-full font-semibold text-white"
      style={{ width: size, height: size, background: color, fontSize: size * 0.42 }}
    >
      {initial}
    </span>
  );
}

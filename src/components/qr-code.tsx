import qrcode from "qrcode-generator";

/** Server-rendered QR code as one SVG path (no JS shipped to the browser). */
export function QrCode({ value, label, className }: { value: string; label: string; className?: string }) {
  const qr = qrcode(0, "M");
  qr.addData(value);
  qr.make();
  const n = qr.getModuleCount();
  let d = "";
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (qr.isDark(r, c)) d += `M${c} ${r}h1v1h-1z`;
  const q = 2; // quiet zone
  return (
    <svg viewBox={`${-q} ${-q} ${n + 2 * q} ${n + 2 * q}`} shapeRendering="crispEdges" role="img" aria-label={label} className={className}>
      <rect x={-q} y={-q} width={n + 2 * q} height={n + 2 * q} fill="#fff" />
      <path d={d} fill="#13237a" />
    </svg>
  );
}

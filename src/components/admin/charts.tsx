import { formatNumber } from "@/lib/format";

type Datum = { key: string; label: string; value: number };

function niceMax(v: number) {
  if (v <= 4) return 4;
  const pow = 10 ** Math.floor(Math.log10(v));
  const n = v / pow;
  return (n <= 2 ? 2 : n <= 5 ? 5 : 10) * pow;
}

/**
 * Single-series column chart (one brand hue, so no legend).
 * Columns ≤ 24px with a rounded data end, hairline grid, hover tooltip per column,
 * and a table view for screen readers / exact values.
 */
export function ColumnChart({ data, unit }: { data: Datum[]; unit: string }) {
  const max = niceMax(Math.max(0, ...data.map((d) => d.value)));
  const ticks = [max, max / 2, 0];
  const peak = data.reduce((a, b) => (b.value > a.value ? b : a), data[0]);

  return (
    <figure>
      <div className="flex gap-3">
        {/* y axis */}
        <div className="flex h-48 flex-col justify-between text-right text-xs text-body/70" aria-hidden>
          {ticks.map((t) => <span key={t} className="-translate-y-1/2 leading-none last:translate-y-1/2">{formatNumber(t)}</span>)}
        </div>
        <div className="relative flex-1">
          {/* grid */}
          <div className="pointer-events-none absolute inset-x-0 top-0 flex h-48 flex-col justify-between" aria-hidden>
            {ticks.map((t) => <span key={t} className="border-t border-line" />)}
          </div>
          <div className="relative flex h-48 items-end gap-0.5" aria-hidden>
            {data.map((d) => (
              <div key={d.key} className="group relative flex h-full flex-1 items-end justify-center">
                {/* hit target spans the whole slot */}
                <span
                  className="w-full max-w-6 rounded-t bg-primary transition group-hover:bg-primary-800"
                  style={{ height: `${(d.value / max) * 100}%`, minHeight: d.value ? 3 : 0 }}
                />
                {d.key === peak?.key && d.value > 0 && (
                  <span className="absolute -translate-y-full pb-1 text-xs font-semibold text-ink" style={{ bottom: `${(d.value / max) * 100}%` }}>
                    {d.value}
                  </span>
                )}
                <span className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 hidden -translate-x-1/2 whitespace-nowrap rounded-lg bg-ink px-2.5 py-1.5 text-xs text-white shadow-lg group-hover:block">
                  {d.label} · <strong className="font-semibold">{formatNumber(d.value)}</strong> {unit}
                </span>
              </div>
            ))}
          </div>
          <div className="mt-2 flex gap-0.5 text-[11px] text-body/70" aria-hidden>
            {data.map((d, i) => (
              <span key={d.key} className="flex-1 text-center">{i % 3 === 0 || i === data.length - 1 ? d.label : ""}</span>
            ))}
          </div>
        </div>
      </div>
      <DataTable data={data} unit={unit} />
    </figure>
  );
}

/** Horizontal bars sorted by value, value at the bar tip in text ink. */
export function BarList({ data, unit }: { data: Datum[]; unit: string }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <figure>
      <ul className="space-y-2.5" aria-hidden>
        {data.map((d) => (
          <li key={d.key} className="grid grid-cols-[7.5rem_1fr] items-center gap-3 text-sm">
            <span className="truncate text-ink" title={d.label}>{d.label}</span>
            <span className="flex items-center gap-2">
              <span
                className="h-3.5 rounded-r bg-primary"
                style={{ width: `${(d.value / max) * 85}%`, minWidth: d.value ? 3 : 0 }}
                title={`${d.label}: ${formatNumber(d.value)} ${unit}`}
              />
              <span className="text-xs font-medium text-ink">{formatNumber(d.value)}</span>
            </span>
          </li>
        ))}
      </ul>
      <DataTable data={data} unit={unit} />
    </figure>
  );
}

function DataTable({ data, unit }: { data: Datum[]; unit: string }) {
  return (
    <details className="mt-4 text-sm">
      <summary className="cursor-pointer text-xs font-medium text-primary">ดูเป็นตาราง</summary>
      <table className="mt-2 w-full text-left text-xs">
        <tbody>
          {data.map((d) => (
            <tr key={d.key} className="border-t border-line">
              <th scope="row" className="py-1.5 font-normal">{d.label}</th>
              <td className="py-1.5 text-right text-ink tabular-nums">{formatNumber(d.value)} {unit}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </details>
  );
}

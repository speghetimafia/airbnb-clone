import { Minus, Plus } from "lucide-react";

type Props = { label: string; sub?: string; value: number; min?: number; max?: number; onChange: (v: number) => void };

/** The "Adults  (−) 2 (+)" row used in guest pickers and the host form. */
export default function Counter({ label, sub, value, min = 0, max = 99, onChange }: Props) {
  const btn = "flex h-8 w-8 items-center justify-center rounded-full border border-[#b0b0b0] text-muted hover:border-ink hover:text-ink disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:border-[#b0b0b0]";
  return (
    <div className="flex items-center justify-between py-4">
      <div>
        <div className="font-semibold">{label}</div>
        {sub && <div className="text-sm text-muted">{sub}</div>}
      </div>
      <div className="flex items-center gap-4">
        <button type="button" className={btn} disabled={value <= min} onClick={() => onChange(value - 1)} aria-label={`Decrease ${label}`}>
          <Minus size={14} />
        </button>
        <span className="w-6 text-center">{value}</span>
        <button type="button" className={btn} disabled={value >= max} onClick={() => onChange(value + 1)} aria-label={`Increase ${label}`}>
          <Plus size={14} />
        </button>
      </div>
    </div>
  );
}

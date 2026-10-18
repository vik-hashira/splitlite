import { useRef } from "react";

/** Four single-digit boxes that auto-advance; calls onChange with the joined value. */
export default function PinInput({ value, onChange, autoFocus }: { value: string; onChange: (v: string) => void; autoFocus?: boolean }) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const digits = value.padEnd(4, " ").slice(0, 4).split("");

  const setDigit = (i: number, d: string) => {
    const next = digits.map((c, j) => (j === i ? d || " " : c)).join("").trimEnd();
    onChange(next.replace(/ /g, ""));
  };

  return (
    <div className="flex justify-center gap-3">
      {digits.map((d, i) => (
        <input
          key={i}
          ref={(el) => { refs.current[i] = el; }}
          value={d.trim()}
          autoFocus={autoFocus && i === 0}
          inputMode="numeric"
          maxLength={1}
          aria-label={`PIN digit ${i + 1}`}
          className="h-14 w-12 rounded-xl border border-slate-300 text-center text-2xl font-semibold focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-200"
          onChange={(e) => {
            const v = e.target.value.replace(/\D/g, "").slice(-1);
            setDigit(i, v);
            if (v && i < 3) refs.current[i + 1]?.focus();
          }}
          onKeyDown={(e) => {
            if (e.key === "Backspace" && !d.trim() && i > 0) refs.current[i - 1]?.focus();
          }}
          onPaste={(e) => {
            const p = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 4);
            if (p) {
              e.preventDefault();
              onChange(p);
              refs.current[Math.min(p.length, 3)]?.focus();
            }
          }}
        />
      ))}
    </div>
  );
}

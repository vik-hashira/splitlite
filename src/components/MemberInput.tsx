import { useState } from "react";

export default function MemberInput({ members, onChange }: { members: string[]; onChange: (m: string[]) => void }) {
  const [draft, setDraft] = useState("");

  const commit = () => {
    const names = draft.split(",").map((s) => s.trim()).filter(Boolean);
    const lower = new Set(members.map((m) => m.toLowerCase()));
    const fresh = names.filter((n) => !lower.has(n.toLowerCase()) && lower.add(n.toLowerCase()));
    if (fresh.length) onChange([...members, ...fresh]);
    setDraft("");
  };

  return (
    <div className="flex flex-wrap gap-2 rounded-xl border border-slate-300 bg-white p-2 focus-within:border-emerald-600">
      {members.map((m) => (
        <span key={m} className="flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-sm text-emerald-800">
          {m}
          <button type="button" aria-label={`Remove ${m}`} onClick={() => onChange(members.filter((x) => x !== m))} className="text-emerald-600 hover:text-emerald-900">×</button>
        </span>
      ))}
      <input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === ",") {
            e.preventDefault();
            commit();
          } else if (e.key === "Backspace" && !draft && members.length) {
            onChange(members.slice(0, -1));
          }
        }}
        onBlur={commit}
        placeholder={members.length ? "Add another…" : "Type a name, press Enter"}
        className="min-w-[8rem] flex-1 px-1 py-1 text-sm focus:outline-none"
      />
    </div>
  );
}

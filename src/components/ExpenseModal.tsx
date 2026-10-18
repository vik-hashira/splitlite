import { useState } from "react";
import Modal from "./Modal";
import { CATEGORIES, detectCategory } from "../lib/categories";
import type { Expense, ExpenseCategory, ExpenseInput, Group } from "../lib/types";

interface Props {
  group: Group;
  me: string | null;
  existing?: Expense;
  onSave: (e: ExpenseInput) => Promise<void>;
  onClose: () => void;
}

export default function ExpenseModal({ group, me, existing, onSave, onClose }: Props) {
  const [amount, setAmount] = useState(existing ? String(existing.amount) : "");
  const [title, setTitle] = useState(existing?.title ?? "");
  const [category, setCategory] = useState<ExpenseCategory>(existing?.category ?? "general");
  const [categoryTouched, setCategoryTouched] = useState(Boolean(existing));
  const [paidBy, setPaidBy] = useState(existing?.paidBy ?? me ?? group.members[0]);
  const [split, setSplit] = useState<string[]>(existing?.splitAmong ?? group.members);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const value = Number(amount);
  const valid = value > 0 && Number.isFinite(value) && title.trim() && split.length > 0;

  const onTitle = (t: string) => {
    setTitle(t);
    if (!categoryTouched) setCategory(detectCategory(t) ?? "general");
  };

  const toggle = (m: string) => setSplit((s) => (s.includes(m) ? s.filter((x) => x !== m) : [...s, m]));
  const allSelected = split.length === group.members.length;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!valid) return;
    setBusy(true);
    try {
      await onSave({
        title: title.trim(),
        category,
        amount: Math.round(value * 100) / 100,
        paidBy,
        splitAmong: group.members.filter((m) => split.includes(m)),
        splitType: "EQUAL",
        createdAt: existing?.createdAt ?? Date.now(),
        createdByName: existing?.createdByName ?? me ?? "Someone",
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save");
      setBusy(false);
    }
  };

  return (
    <Modal title={existing ? "Edit expense" : "Add expense"} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <div className="flex items-baseline gap-2 border-b border-slate-200 pb-2">
          <span className="text-xl text-slate-500">{group.currency}</span>
          <input autoFocus inputMode="decimal" value={amount} placeholder="0"
            onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ""))}
            aria-label="Amount"
            className="w-full text-4xl font-bold focus:outline-none" />
        </div>

        <input value={title} onChange={(e) => onTitle(e.target.value)} placeholder="What was it for?" maxLength={80}
          aria-label="Description"
          className="w-full rounded-xl border border-slate-300 px-3 py-2 focus:border-emerald-600 focus:outline-none" />

        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((c) => (
            <button type="button" key={c.id} aria-pressed={category === c.id}
              onClick={() => { setCategory(c.id); setCategoryTouched(true); }}
              className={`rounded-full border px-3 py-1 text-sm ${category === c.id ? "border-emerald-600 bg-emerald-50 text-emerald-800" : "border-slate-200"}`}>
              {c.emoji} {c.label}
            </button>
          ))}
        </div>

        <label className="block">
          <span className="text-sm font-medium">Paid by</span>
          <select value={paidBy} onChange={(e) => setPaidBy(e.target.value)}
            className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2">
            {group.members.map((m) => <option key={m}>{m}</option>)}
          </select>
        </label>

        <fieldset>
          <div className="flex items-center justify-between">
            <legend className="text-sm font-medium">Split equally between</legend>
            <button type="button" className="text-sm text-emerald-700"
              onClick={() => setSplit(allSelected ? [] : group.members)}>
              {allSelected ? "Clear" : "Select all"}
            </button>
          </div>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {group.members.map((m) => (
              <label key={m} className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm">
                <input type="checkbox" checked={split.includes(m)} onChange={() => toggle(m)} className="accent-emerald-600" />
                {m}
              </label>
            ))}
          </div>
          {split.length > 0 && value > 0 && (
            <p className="mt-2 text-xs text-slate-500">≈ {(value / split.length).toFixed(2)} each</p>
          )}
        </fieldset>

        {error && <p className="text-sm text-red-600">{error}</p>}
        <button disabled={!valid || busy}
          className="sticky bottom-0 w-full rounded-xl bg-emerald-600 py-3 font-semibold text-white shadow-[0_-8px_16px_white] hover:bg-emerald-700 disabled:bg-slate-300">
          {busy ? "Saving…" : existing ? "Save changes" : "Add expense"}
        </button>
      </form>
    </Modal>
  );
}

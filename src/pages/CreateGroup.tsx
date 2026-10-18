import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import MemberInput from "../components/MemberInput";
import PinInput from "../components/PinInput";
import { createGroup } from "../lib/firebase";
import { CURRENCIES } from "../lib/format";
import { hashPin, markUnlocked } from "../lib/pin";
import { forgetGroup, getRecentGroups, rememberGroup } from "../lib/storage";

const EMOJIS = ["🌴", "🏔️", "🏖️", "🎉", "🍻", "🚗", "✈️", "🏕️", "🏠", "🎂", "⛺", "🛶"];
const randomEmoji = () => EMOJIS[Math.floor(Math.random() * EMOJIS.length)];

export default function CreateGroup() {
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [emoji, setEmoji] = useState(randomEmoji);
  const [currency, setCurrency] = useState("INR");
  const [members, setMembers] = useState<string[]>([]);
  const [usePin, setUsePin] = useState(false);
  const [pin, setPin] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [recent, setRecent] = useState(getRecentGroups);

  const valid = title.trim() && members.length >= 2 && (!usePin || pin.length === 4);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!valid) return;
    setBusy(true);
    setError("");
    try {
      const fullTitle = `${title.trim()} ${emoji}`;
      const id = await createGroup({
        title: fullTitle,
        currency,
        members,
        pinHash: usePin ? await hashPin(pin) : null,
      });
      rememberGroup(id, fullTitle);
      markUnlocked(id);
      navigate(`/g/${id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create group");
      setBusy(false);
    }
  };

  return (
    <main className="mx-auto max-w-md px-4 pb-16 pt-10">
      <h1 className="text-3xl font-bold tracking-tight">Split<span className="text-emerald-600">Lite</span></h1>
      <p className="mt-1 text-sm text-slate-600">Split group expenses. No sign-up, just share the link.</p>

      <form onSubmit={submit} className="mt-8 space-y-5 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
        <label className="block">
          <span className="text-sm font-medium">Group name</span>
          <div className="mt-1 flex gap-2">
            <button type="button" onClick={() => setEmoji(randomEmoji())} title="Shuffle emoji"
              className="rounded-xl border border-slate-300 px-3 text-xl hover:bg-slate-50">{emoji}</button>
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Goa Road Trip" maxLength={60}
              className="w-full rounded-xl border border-slate-300 px-3 py-2 focus:border-emerald-600 focus:outline-none" />
          </div>
        </label>

        <label className="block">
          <span className="text-sm font-medium">Currency</span>
          <select value={currency} onChange={(e) => setCurrency(e.target.value)}
            className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 focus:border-emerald-600 focus:outline-none">
            {CURRENCIES.map((c) => <option key={c}>{c}</option>)}
          </select>
        </label>

        <div>
          <span className="text-sm font-medium">Members <span className="font-normal text-slate-500">(at least 2)</span></span>
          <div className="mt-1"><MemberInput members={members} onChange={setMembers} /></div>
        </div>

        <div>
          <label className="flex items-center justify-between">
            <span className="text-sm font-medium">Protect with 4-digit PIN</span>
            <input type="checkbox" checked={usePin} onChange={(e) => setUsePin(e.target.checked)} className="h-5 w-5 accent-emerald-600" />
          </label>
          {usePin && <div className="mt-3"><PinInput value={pin} onChange={setPin} /></div>}
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button disabled={!valid || busy}
          className="w-full rounded-xl bg-emerald-600 py-3 font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300">
          {busy ? "Creating…" : "Create & Get Link"}
        </button>
      </form>

      {recent.length > 0 && (
        <section className="mt-8">
          <h2 className="text-sm font-semibold text-slate-500">Recent groups</h2>
          <ul className="mt-2 divide-y divide-slate-100 rounded-2xl bg-white ring-1 ring-slate-200">
            {recent.map((g) => (
              <li key={g.id} className="flex items-center justify-between px-4 py-3">
                <Link to={`/g/${g.id}`} className="font-medium hover:text-emerald-700">{g.title}</Link>
                <button aria-label={`Remove ${g.title} from recent`} onClick={() => { forgetGroup(g.id); setRecent(getRecentGroups()); }}
                  className="text-slate-400 hover:text-slate-600">×</button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}

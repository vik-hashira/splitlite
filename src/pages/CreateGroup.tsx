import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import MemberInput from "../components/MemberInput";
import PinInput from "../components/PinInput";
import { createGroup } from "../lib/firebase";
import { track } from "../lib/analytics";
import { CURRENCIES } from "../lib/format";
import { hashPin, markUnlocked } from "../lib/pin";
import { forgetGroup, getRecentGroups, rememberGroup, setMe } from "../lib/storage";

const EMOJIS = ["🌴", "🏔️", "🏖️", "🎉", "🍻", "🚗", "✈️", "🏕️", "🏠", "🎂", "⛺", "🛶"];
const randomEmoji = () => EMOJIS[Math.floor(Math.random() * EMOJIS.length)];

export default function CreateGroup() {
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [emoji, setEmoji] = useState(randomEmoji);
  const [currency, setCurrency] = useState("INR");
  const [members, setMembers] = useState<string[]>([]);
  const [creator, setCreator] = useState("");
  const [usePin, setUsePin] = useState(false);
  const [pin, setPin] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [recent, setRecent] = useState(getRecentGroups);

  // Fall back to the first member if the chosen "you" was removed from the list.
  const admin = members.includes(creator) ? creator : members[0] ?? "";
  const valid = title.trim() && members.length >= 2 && admin && (!usePin || pin.length === 4);

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
        creatorName: admin,
        pinHash: usePin ? await hashPin(pin) : null,
      });
      setMe(id, admin);
      track("group_created", { currency, members: members.length, has_pin: usePin });
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

        {members.length > 0 && (
          <label className="block">
            <span className="text-sm font-medium">Which one is you?</span>
            <select value={admin} onChange={(e) => setCreator(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 focus:border-emerald-600 focus:outline-none">
              {members.map((m) => <option key={m}>{m}</option>)}
            </select>
            <span className="mt-1 block text-xs text-slate-500">
              You'll be the group admin: you can edit or delete any expense and delete the group.
            </span>
          </label>
        )}

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

      <About />
    </main>
  );
}

const GITHUB_URL = "https://github.com/vik-hashira/splitlite";
const X_URL = "https://x.com/Eng_Vik_";

function About() {
  return (
    <section className="mt-10 rounded-2xl bg-emerald-50 p-5 text-sm text-slate-700 ring-1 ring-emerald-100">
      <h2 className="font-semibold text-emerald-900">Free &amp; open, made for the community 💚</h2>
      <p className="mt-2">
        SplitLite is a free, open-source side project by an independent developer. No ads, no accounts, no catch.
        Please use it wisely and be kind to the free servers.
      </p>
      <ul className="mt-3 space-y-1.5">
        <li>🔒 <b>Your data is never sold or shared.</b> It's only used to show your group to people who have the link.</li>
        <li>🔗 Anyone with a group's link can see and edit it, so share links only with people you trust and add a PIN for extra protection.</li>
        <li>🗓️ Groups and their expenses are <b>deleted automatically after 1 year</b>, and you can delete a group yourself at any time.</li>
        <li>📊 Anonymous usage stats (page visits, how many groups or expenses get created) help improve the app. Names, amounts and group details are never included.</li>
      </ul>
      <div className="mt-4 flex flex-wrap gap-3">
        <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer" onClick={() => track("outbound_click", { target: "github" })}
          className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-1.5 font-medium text-white hover:bg-slate-700">
          <svg aria-hidden="true" viewBox="0 0 16 16" className="h-4 w-4 fill-current"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/></svg>
          Star on GitHub
        </a>
        <a href={X_URL} target="_blank" rel="noopener noreferrer" onClick={() => track("outbound_click", { target: "x" })}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 font-medium hover:bg-slate-50">
          <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4 fill-current"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
          @Eng_Vik_
        </a>
      </div>
    </section>
  );
}

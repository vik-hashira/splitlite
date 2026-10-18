import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import Chip from "../components/Chip";
import ExpenseModal from "../components/ExpenseModal";
import Modal from "../components/Modal";
import SettleUpModal from "../components/SettleUpModal";
import UnlockOverlay from "../components/UnlockOverlay";
import { CATEGORIES, categoryEmoji } from "../lib/categories";
import {
  RETENTION_MS, addExpense, addMember, claimAdmin, backfillExpiry, deleteExpense, deleteGroup, subscribeExpenses,
  subscribeGroup, updateExpense,
} from "../lib/firebase";
import { track } from "../lib/analytics";
import { dayLabel, formatMoney } from "../lib/format";
import { isUnlocked, markUnlocked } from "../lib/pin";
import { calculateBalances, calculateSettlements, equalShares, type Settlement } from "../lib/settlements";
import { canDeleteGroup, canEditExpense, isGroupAdmin } from "../lib/permissions";
import { forgetGroup, getMe, rememberGroup, setMe as saveMe } from "../lib/storage";
import type { Expense, ExpenseCategory, ExpenseInput, Group } from "../lib/types";

type MemberFilter = { kind: "all" } | { kind: "paidByMe" } | { kind: "splitWithMe" } | { kind: "member"; name: string };

export default function GroupPage() {
  const { groupId = "" } = useParams();
  const navigate = useNavigate();
  const [group, setGroup] = useState<Group | null | undefined>(undefined);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [error, setError] = useState("");
  const [unlocked, setUnlocked] = useState(() => isUnlocked(groupId));
  const [me, setMeState] = useState<string | null>(() => getMe(groupId));
  const [catFilter, setCatFilter] = useState<ExpenseCategory | "all">("all");
  const [memberFilter, setMemberFilter] = useState<MemberFilter>({ kind: "all" });
  const [editing, setEditing] = useState<Expense | "new" | null>(null);
  const [settleOpen, setSettleOpen] = useState(false);
  const [pickMeOpen, setPickMeOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [claimOpen, setClaimOpen] = useState(false);

  useEffect(() => {
    const onErr = (e: Error) => setError(e.message);
    const u1 = subscribeGroup(groupId, setGroup, onErr);
    const u2 = subscribeExpenses(groupId, setExpenses, onErr);
    return () => { u1(); u2(); };
  }, [groupId]);

  useEffect(() => {
    if (group) rememberGroup(group.id, group.title);
  }, [group?.id, group?.title]); // eslint-disable-line react-hooks/exhaustive-deps

  // Groups created before auto-expiry existed get stamped once on first open.
  useEffect(() => {
    if (group && !group.expireAt) backfillExpiry(group).catch(() => {});
  }, [group]);

  useEffect(() => {
    if (group) track("group_opened", { has_pin: Boolean(group.pinHash), members: group.members.length });
  }, [group?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Ask "who are you?" once the group is available and we don't know yet.
  useEffect(() => {
    if (group && (!me || !group.members.includes(me))) setPickMeOpen(true);
  }, [group, me]);

  const onUnlock = useCallback(() => {
    markUnlocked(groupId);
    setUnlocked(true);
    track("group_unlocked");
  }, [groupId]);

  const balances = useMemo(() => (group ? calculateBalances(group.members, expenses) : {}), [group, expenses]);
  const settlements = useMemo(() => (group ? calculateSettlements(group.members, expenses) : []), [group, expenses]);

  const filtered = useMemo(() => expenses.filter((e) => {
    if (catFilter !== "all" && e.category !== catFilter) return false;
    switch (memberFilter.kind) {
      case "paidByMe": return e.paidBy === me;
      case "splitWithMe": return me != null && e.splitAmong.includes(me);
      case "member": return e.paidBy === memberFilter.name;
      default: return true;
    }
  }), [expenses, catFilter, memberFilter, me]);

  // Exact per-person share (same cent rounding as balances) of whatever the filters show.
  const filteredSummary = useMemo(() => {
    let total = 0;
    let myShare = 0;
    for (const e of filtered) {
      const cents = Math.round(e.amount * 100);
      total += cents;
      if (me && e.splitAmong.includes(me)) myShare += equalShares(cents, e.splitAmong)[me];
    }
    return { total: total / 100, myShare: myShare / 100 };
  }, [filtered, me]);

  const grouped = useMemo(() => {
    const out: { day: string; items: Expense[] }[] = [];
    for (const e of filtered) {
      const day = dayLabel(e.createdAt);
      if (out.at(-1)?.day === day) out.at(-1)!.items.push(e);
      else out.push({ day, items: [e] });
    }
    return out;
  }, [filtered]);

  if (error) return <Centered><p className="text-red-600">{error}</p><BackHome /></Centered>;
  if (group === undefined) return <Centered><p className="text-slate-500">Loading…</p></Centered>;
  if (group === null) return <Centered><p className="text-slate-600">This group doesn't exist.</p><BackHome /></Centered>;
  if (group.pinHash && !unlocked) return <UnlockOverlay title={group.title} pinHash={group.pinHash} onUnlock={onUnlock} />;

  const myBalance = me ? balances[me] ?? 0 : 0;
  const total = expenses.reduce((s, e) => s + e.amount, 0);

  const expiresAt = group.expireAt?.toMillis() ?? group.createdAt + RETENTION_MS;

  const save = async (input: ExpenseInput) => {
    if (editing && editing !== "new") {
      await updateExpense(groupId, editing.id, input);
      track("expense_edited", { category: input.category });
    } else {
      await addExpense(group, input);
      track("expense_added", { category: input.category, split_count: input.splitAmong.length, currency: group.currency });
    }
  };

  const removeExpense = async (e: Expense) => {
    await deleteExpense(groupId, e.id);
    track("expense_deleted");
  };

  const removeGroup = async () => {
    await deleteGroup(groupId);
    track("group_deleted", { expenses: expenses.length });
    forgetGroup(groupId);
    navigate("/", { replace: true });
  };

  const recordSettlement = (s: Settlement) =>
    addExpense(group, {
      title: `Settlement: ${s.from} → ${s.to}`,
      category: "general",
      amount: s.amount,
      paidBy: s.from,
      splitAmong: [s.to],
      splitType: "EQUAL",
      createdAt: Date.now(),
      createdByName: me ?? "Someone",
    }).then(() => track("settlement_recorded"));

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      track("share_link_copied");
      setTimeout(() => setCopied(false), 1500);
    } catch {
      window.prompt("Copy this link:", window.location.href);
    }
  };

  const chooseMe = (name: string) => { saveMe(groupId, name); setMeState(name); setPickMeOpen(false); };

  return (
    <div className="mx-auto min-h-screen max-w-2xl pb-28">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="flex items-center justify-between gap-2 px-4 pt-3">
          <Link to="/" className="text-sm text-slate-500 hover:text-slate-800" aria-label="Home">←</Link>
          <h1 className="flex-1 truncate text-lg font-semibold">{group.title}</h1>
          <button onClick={copyLink} className="rounded-lg border border-slate-200 px-2.5 py-1 text-sm hover:bg-slate-50">
            {copied ? "Copied ✓" : "🔗 Copy link"}
          </button>
        </div>
        <div className="flex items-center justify-between px-4 pb-3 pt-2">
          <button onClick={() => setPickMeOpen(true)} className="text-sm text-slate-600 hover:text-slate-900">
            {me ? <>You: <b>{me}</b>{isGroupAdmin(group, me) && " · admin"} ▾</> : "Who are you? ▾"}
          </button>
          <span className="text-xs text-slate-500">Total spent {formatMoney(total, group.currency)}</span>
        </div>
        <button onClick={() => { setSettleOpen(true); track("settle_up_opened", { transfers: settlements.length }); }}
          className={`flex w-full items-center justify-between px-4 py-3 text-left ${myBalance > 0.004 ? "bg-emerald-50 text-emerald-800" : myBalance < -0.004 ? "bg-red-50 text-red-800" : "bg-slate-100 text-slate-700"}`}>
          <span className="font-semibold">
            {!me ? "Pick who you are to see your balance"
              : myBalance > 0.004 ? `You are owed ${formatMoney(myBalance, group.currency)}`
              : myBalance < -0.004 ? `You owe ${formatMoney(-myBalance, group.currency)}`
              : "You're all settled up"}
          </span>
          <span className="rounded-lg bg-white/70 px-2.5 py-1 text-sm font-medium">Settle up →</span>
        </button>
      </header>

      <div className="no-scrollbar flex gap-2 overflow-x-auto px-4 pt-4">
        <Chip active={catFilter === "all"} onClick={() => setCatFilter("all")}>All</Chip>
        {CATEGORIES.map((c) => (
          <Chip key={c.id} active={catFilter === c.id} onClick={() => setCatFilter(c.id)}>{c.emoji} {c.label}</Chip>
        ))}
      </div>
      <div className="no-scrollbar flex gap-2 overflow-x-auto px-4 pt-2">
        <Chip active={memberFilter.kind === "all"} onClick={() => setMemberFilter({ kind: "all" })}>Everyone</Chip>
        {me && <Chip active={memberFilter.kind === "paidByMe"} onClick={() => setMemberFilter({ kind: "paidByMe" })}>Paid by me</Chip>}
        {me && <Chip active={memberFilter.kind === "splitWithMe"} onClick={() => setMemberFilter({ kind: "splitWithMe" })}>Split with me</Chip>}
        {group.members.map((m) => (
          <Chip key={m} active={memberFilter.kind === "member" && memberFilter.name === m}
            onClick={() => setMemberFilter({ kind: "member", name: m })}>Paid by {m}</Chip>
        ))}
      </div>

      <main className="px-4 pt-4">
        {(catFilter !== "all" || memberFilter.kind !== "all") && filtered.length > 0 && (
          <div className="mb-4 flex items-center justify-between rounded-xl bg-slate-900 px-4 py-3 text-white">
            <div>
              <p className="text-xs text-slate-300">
                {filterLabel(catFilter, memberFilter)} · {filtered.length} expense{filtered.length === 1 ? "" : "s"}
              </p>
              <p className="text-xl font-bold">{formatMoney(filteredSummary.total, group.currency)}</p>
            </div>
            {me && (
              <div className="text-right">
                <p className="text-xs text-slate-300">Your share</p>
                <p className="font-semibold">{formatMoney(filteredSummary.myShare, group.currency)}</p>
              </div>
            )}
          </div>
        )}
        {grouped.length === 0 && (
          <p className="py-16 text-center text-slate-500">
            {expenses.length === 0 ? "No expenses yet. Tap + to add the first one." : "No expenses match these filters."}
          </p>
        )}
        {grouped.map(({ day, items }) => (
          <section key={day} className="mb-5">
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">{day}</h2>
            <ul className="space-y-2">
              {items.map((e) => (
                <ExpenseCard key={e.id} expense={e} currency={group.currency} me={me} canEdit={canEditExpense(e, group, me)}
                  onEdit={() => setEditing(e)} onDelete={() => removeExpense(e)} />
              ))}
            </ul>
          </section>
        ))}

        <footer className="mt-10 border-t border-slate-200 pt-4 text-center text-xs text-slate-500">
          <p>This group and all its expenses are deleted automatically on{" "}
            <b>{new Date(expiresAt).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })}</b>.</p>
          {!group.creatorName && me && (
            <p className="mt-2">
              This group has no admin yet.{" "}
              <button onClick={() => setClaimOpen(true)} className="font-medium text-emerald-700 hover:underline">
                Make {me} the admin
              </button>
            </p>
          )}
          {canDeleteGroup(group, me) && (
            <button onClick={() => setDeleteOpen(true)} className="mt-2 text-red-600 hover:underline">Delete this group now</button>
          )}
        </footer>
      </main>

      <button onClick={() => setEditing("new")}
        className="fixed bottom-6 right-6 z-40 rounded-full bg-emerald-600 px-5 py-4 font-semibold text-white shadow-lg hover:bg-emerald-700"
        style={{ marginBottom: "env(safe-area-inset-bottom)" }}>
        + Add Expense
      </button>

      {editing && (
        <ExpenseModal group={group} me={me} existing={editing === "new" ? undefined : editing}
          onSave={save} onClose={() => setEditing(null)} />
      )}
      {settleOpen && (
        <SettleUpModal settlements={settlements} balances={balances} currency={group.currency} me={me}
          onRecord={recordSettlement} onClose={() => setSettleOpen(false)} />
      )}
      {claimOpen && me && (
        <Modal title="Become group admin?" onClose={() => setClaimOpen(false)}>
          <p className="text-sm text-slate-600">
            <b>{me}</b> will be the admin of <b>{group.title}</b>: able to edit or delete any expense and delete the
            group. Everyone else can only edit what they added. <b>This can't be changed later.</b>
          </p>
          <button
            onClick={async () => { await claimAdmin(groupId, me); track("admin_claimed"); setClaimOpen(false); }}
            className="mt-4 w-full rounded-xl bg-emerald-600 py-3 font-semibold text-white hover:bg-emerald-700">
            Yes, make {me} admin
          </button>
        </Modal>
      )}
      {deleteOpen && (
        <DeleteGroupModal title={group.title} count={expenses.length} onConfirm={removeGroup} onClose={() => setDeleteOpen(false)} />
      )}
      {pickMeOpen && (
        <WhoAreYou members={group.members} me={me} onPick={chooseMe} onClose={() => setPickMeOpen(false)}
          onAdd={async (name) => { await addMember(groupId, [...group.members, name]); chooseMe(name); }} />
      )}
    </div>
  );
}

function filterLabel(cat: ExpenseCategory | "all", member: MemberFilter): string {
  const c = CATEGORIES.find((x) => x.id === cat);
  const parts = [c ? `${c.emoji} ${c.label}` : ""];
  if (member.kind === "paidByMe") parts.push("paid by you");
  else if (member.kind === "splitWithMe") parts.push("split with you");
  else if (member.kind === "member") parts.push(`paid by ${member.name}`);
  const label = parts.filter(Boolean).join(", ");
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function ExpenseCard({ expense: e, currency, me, canEdit, onEdit, onDelete }: {
  expense: Expense; currency: string; me: string | null; canEdit: boolean; onEdit: () => void; onDelete: () => void;
}) {
  const [confirming, setConfirming] = useState(false);
  const myShare = me && e.splitAmong.includes(me) ? e.amount / e.splitAmong.length : 0;
  return (
    <li className="flex items-center gap-3 rounded-xl bg-white p-3 shadow-sm ring-1 ring-slate-200">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xl">{categoryEmoji(e.category)}</div>
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">{e.title}</p>
        <p className="truncate text-xs text-slate-500">
          {e.paidBy === me ? "You" : e.paidBy} paid · split {e.splitAmong.length} way{e.splitAmong.length === 1 ? "" : "s"}
          {myShare > 0 && ` · your share ${formatMoney(myShare, currency)}`}
        </p>
      </div>
      <div className="text-right">
        <p className="font-semibold">{formatMoney(e.amount, currency)}</p>
        {confirming ? (
          <span className="text-xs">
            <button onClick={onDelete} className="font-medium text-red-600">Delete</button>
            {" · "}
            <button onClick={() => setConfirming(false)} className="text-slate-500">Cancel</button>
          </span>
        ) : canEdit ? (
          <span className="text-xs text-slate-400">
            <button onClick={onEdit} className="hover:text-slate-700">Edit</button>
            {" · "}
            <button onClick={() => setConfirming(true)} className="hover:text-red-600">Delete</button>
          </span>
        ) : (
          <span className="text-xs text-slate-400">by {e.createdByName}</span>
        )}
      </div>
    </li>
  );
}

function WhoAreYou({ members, me, onPick, onAdd, onClose }: {
  members: string[]; me: string | null; onPick: (m: string) => void; onAdd: (m: string) => Promise<void>; onClose: () => void;
}) {
  const [newName, setNewName] = useState("");
  const name = newName.trim();
  const dup = members.some((m) => m.toLowerCase() === name.toLowerCase());
  return (
    <Modal title="Who are you?" onClose={onClose}>
      <div className="grid grid-cols-2 gap-2">
        {members.map((m) => (
          <button key={m} onClick={() => onPick(m)}
            className={`rounded-xl border px-3 py-3 font-medium ${m === me ? "border-emerald-600 bg-emerald-50" : "border-slate-200 hover:bg-slate-50"}`}>
            {m}
          </button>
        ))}
      </div>
      <form className="mt-4 flex gap-2" onSubmit={(e) => { e.preventDefault(); if (name && !dup) onAdd(name); }}>
        <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Not listed? Add yourself" maxLength={30}
          className="flex-1 rounded-xl border border-slate-300 px-3 py-2 text-sm" />
        <button disabled={!name || dup} className="rounded-xl bg-slate-900 px-4 text-sm text-white disabled:bg-slate-300">Join</button>
      </form>
    </Modal>
  );
}

function DeleteGroupModal({ title, count, onConfirm, onClose }: {
  title: string; count: number; onConfirm: () => Promise<void>; onClose: () => void;
}) {
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return (
    <Modal title="Delete group?" onClose={onClose}>
      <p className="text-sm text-slate-600">
        This permanently deletes <b>{title}</b> and its {count} expense{count === 1 ? "" : "s"} for everyone with the link.
        It can't be undone.
      </p>
      <label className="mt-4 block text-sm">
        Type <b>DELETE</b> to confirm
        <input value={typed} onChange={(e) => setTyped(e.target.value)} autoFocus
          className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2" />
      </label>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      <button disabled={typed !== "DELETE" || busy}
        onClick={async () => {
          setBusy(true);
          try { await onConfirm(); } catch (err) { setError(err instanceof Error ? err.message : "Could not delete"); setBusy(false); }
        }}
        className="mt-4 w-full rounded-xl bg-red-600 py-3 font-semibold text-white hover:bg-red-700 disabled:bg-slate-300">
        {busy ? "Deleting…" : "Delete forever"}
      </button>
    </Modal>
  );
}

const Centered = ({ children }: { children: React.ReactNode }) => (
  <main className="flex min-h-screen flex-col items-center justify-center gap-3 px-4 text-center">{children}</main>
);
const BackHome = () => <Link to="/" className="text-emerald-700 underline">Go home</Link>;

export interface Settlement {
  from: string;
  to: string;
  amount: number;
}

type SplitExpense = { amount: number; paidBy: string; splitAmong: string[] };

const toCents = (n: number) => Math.round(n * 100);

/**
 * Split an amount (in cents) equally, handing leftover cents to the first participants
 * so the shares always sum exactly to the total.
 */
export function equalShares(cents: number, people: string[]): Record<string, number> {
  const base = Math.floor(cents / people.length);
  let remainder = cents - base * people.length;
  const shares: Record<string, number> = {};
  for (const p of people) {
    shares[p] = base + (remainder > 0 ? 1 : 0);
    if (remainder > 0) remainder--;
  }
  return shares;
}

/** Net balance per member in major units. Positive = is owed, negative = owes. */
export function calculateBalances(members: string[], expenses: SplitExpense[]): Record<string, number> {
  const cents: Record<string, number> = {};
  members.forEach((m) => (cents[m] = 0));
  for (const e of expenses) {
    if (e.splitAmong.length === 0) continue;
    const total = toCents(e.amount);
    cents[e.paidBy] = (cents[e.paidBy] ?? 0) + total;
    const shares = equalShares(total, e.splitAmong);
    for (const [m, share] of Object.entries(shares)) cents[m] = (cents[m] ?? 0) - share;
  }
  const out: Record<string, number> = {};
  for (const [m, c] of Object.entries(cents)) out[m] = c / 100;
  return out;
}

/** Greedy minimum-ish transfer plan: largest debtor pays largest creditor until all settle. */
export function calculateSettlements(members: string[], expenses: SplitExpense[]): Settlement[] {
  const balances = calculateBalances(members, expenses);
  const debtors: { member: string; cents: number }[] = [];
  const creditors: { member: string; cents: number }[] = [];
  for (const [member, bal] of Object.entries(balances)) {
    const c = toCents(bal);
    if (c < 0) debtors.push({ member, cents: -c });
    else if (c > 0) creditors.push({ member, cents: c });
  }
  debtors.sort((a, b) => b.cents - a.cents);
  creditors.sort((a, b) => b.cents - a.cents);

  const settlements: Settlement[] = [];
  let d = 0;
  let c = 0;
  while (d < debtors.length && c < creditors.length) {
    const amt = Math.min(debtors[d].cents, creditors[c].cents);
    settlements.push({ from: debtors[d].member, to: creditors[c].member, amount: amt / 100 });
    debtors[d].cents -= amt;
    creditors[c].cents -= amt;
    if (debtors[d].cents === 0) d++;
    if (creditors[c].cents === 0) c++;
  }
  return settlements;
}

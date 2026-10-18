import type { Expense, Group } from "./types";

// Ownership is by member name, chosen in "Who are you?". There are no accounts, so this is an
// honor system: it decides which buttons each person sees, not who can technically write.

/** The group's admin: whoever created it. Groups made before this existed have none. */
export const isGroupAdmin = (group: Group, me: string | null) =>
  me != null && group.creatorName === me;

/** Who may edit/delete an expense: the member who added it, or the group's admin. */
export function canEditExpense(expense: Expense, group: Group, me: string | null): boolean {
  if (me == null) return false;
  if (expense.createdByName === me || isGroupAdmin(group, me)) return true;
  // Expenses whose adder isn't a member (e.g. imported ones) belong to the admin; with no admin
  // set, anyone can edit them as before.
  return !group.members.includes(expense.createdByName) && !group.creatorName;
}

/** Groups with an admin can only be deleted by them; older groups without one by anyone. */
export const canDeleteGroup = (group: Group, me: string | null) =>
  group.creatorName ? isGroupAdmin(group, me) : me != null;

export type ExpenseCategory = "food" | "travel" | "stay" | "drinks" | "tickets" | "general";

export interface Group {
  id: string;
  title: string;
  currency: string;
  pinHash: string | null;
  members: string[];
  createdAt: number;
  updatedAt: number;
  expireAt?: { toMillis(): number };
  /** Member who created the group (its admin); absent on groups made before admins existed. */
  creatorName?: string;
}

export interface Expense {
  id: string;
  title: string;
  category: ExpenseCategory;
  amount: number;
  paidBy: string;
  splitAmong: string[];
  splitType: "EQUAL";
  createdAt: number;
  /** Member who added it ("Who are you?" at the time); they and the group admin can edit it. */
  createdByName: string;
}

export type ExpenseInput = Omit<Expense, "id">;

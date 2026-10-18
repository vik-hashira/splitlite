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
  /** Anonymous-auth uid of the device that created the group; absent on groups made before ownership. */
  creatorUid?: string;
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
  createdByName: string;
  /** Anonymous-auth uid of the device that added it; absent on older expenses, which anyone can edit. */
  creatorUid?: string;
}

export type ExpenseInput = Omit<Expense, "id" | "creatorUid">;

import Modal from "./Modal";
import { formatMoney } from "../lib/format";
import type { Settlement } from "../lib/settlements";

interface Props {
  settlements: Settlement[];
  balances: Record<string, number>;
  currency: string;
  me: string | null;
  onRecord: (s: Settlement) => Promise<void>;
  onClose: () => void;
}

export default function SettleUpModal({ settlements, balances, currency, me, onRecord, onClose }: Props) {
  return (
    <Modal title="Settle up" onClose={onClose}>
      {settlements.length === 0 ? (
        <p className="py-6 text-center text-slate-600">🎉 Everyone is settled up.</p>
      ) : (
        <ul className="space-y-2">
          {settlements.map((s) => (
            <li key={`${s.from}-${s.to}`}
              className={`flex items-center justify-between rounded-xl border px-3 py-3 ${s.from === me || s.to === me ? "border-emerald-300 bg-emerald-50" : "border-slate-200"}`}>
              <span className="text-sm">
                <b>{s.from}</b> pays <b>{s.to}</b>
                <span className="block text-base font-semibold">{formatMoney(s.amount, currency)}</span>
              </span>
              <button onClick={() => onRecord(s)} className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-700">
                Mark paid
              </button>
            </li>
          ))}
        </ul>
      )}

      <h3 className="mt-6 text-sm font-semibold text-slate-500">Balances</h3>
      <ul className="mt-2 space-y-1 text-sm">
        {Object.entries(balances).map(([m, b]) => (
          <li key={m} className="flex justify-between">
            <span>{m}{m === me && " (you)"}</span>
            <span className={b > 0.004 ? "text-emerald-700" : b < -0.004 ? "text-red-600" : "text-slate-500"}>
              {b > 0.004 ? "+" : ""}{formatMoney(b, currency)}
            </span>
          </li>
        ))}
      </ul>
    </Modal>
  );
}

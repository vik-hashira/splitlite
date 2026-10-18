import { useEffect, useState } from "react";
import PinInput from "./PinInput";
import { hashPin } from "../lib/pin";

export default function UnlockOverlay({ title, pinHash, onUnlock }: { title: string; pinHash: string; onUnlock: () => void }) {
  const [pin, setPin] = useState("");
  const [wrong, setWrong] = useState(false);

  useEffect(() => {
    if (pin.length !== 4) return;
    let stale = false;
    hashPin(pin).then((h) => {
      if (stale) return;
      if (h === pinHash) onUnlock();
      else {
        setWrong(true);
        setPin("");
      }
    });
    return () => { stale = true; };
  }, [pin, pinHash, onUnlock]);

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-4 text-center">
      <div className="text-4xl">🔒</div>
      <h1 className="mt-3 text-xl font-semibold">{title}</h1>
      <p className="mb-6 mt-1 text-sm text-slate-600">Enter the group PIN</p>
      <PinInput value={pin} onChange={(v) => { setWrong(false); setPin(v); }} autoFocus />
      {wrong && <p className="mt-4 text-sm text-red-600">Incorrect PIN, try again.</p>}
    </main>
  );
}

import { useEffect, useState, type ReactNode } from "react";

/**
 * Height of the area not covered by the on-screen keyboard. `vh` units and `position: fixed`
 * ignore the keyboard on iOS/Android, so a bottom sheet ends up mostly hidden behind it.
 */
function useVisibleViewport() {
  const vv = typeof window !== "undefined" ? window.visualViewport : null;
  const read = () => ({ height: vv?.height ?? window.innerHeight, top: vv?.offsetTop ?? 0 });
  const [size, setSize] = useState(read);
  useEffect(() => {
    if (!vv) return;
    const update = () => setSize(read());
    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);
    return () => {
      vv.removeEventListener("resize", update);
      vv.removeEventListener("scroll", update);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return size;
}

export default function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  const { height, top } = useVisibleViewport();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    // Stop the page behind the sheet from scrolling (and dragging the sheet) while it's open.
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-x-0 z-50 flex items-end justify-center bg-slate-900/40 sm:items-center"
      style={{ top, height }}
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="flex w-full max-w-md flex-col rounded-t-2xl bg-white shadow-xl sm:rounded-2xl"
        style={{ maxHeight: height * 0.95 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-center justify-between px-5 pb-2 pt-4">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button onClick={onClose} aria-label="Close" className="rounded-full p-1 text-slate-500 hover:bg-slate-100">✕</button>
        </div>
        <div className="overflow-y-auto overscroll-contain px-5 pb-5" style={{ paddingBottom: "max(1.25rem, env(safe-area-inset-bottom))" }}>
          {children}
        </div>
      </div>
    </div>
  );
}

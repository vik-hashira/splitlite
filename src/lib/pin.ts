export async function hashPin(pin: string): Promise<string> {
  // crypto.subtle only exists on secure (HTTPS or localhost) pages.
  if (!globalThis.crypto?.subtle) {
    throw new Error("PINs need a secure connection. Open the https:// version of this page and try again.");
  }
  const data = new TextEncoder().encode(pin);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

const unlockKey = (groupId: string) => `splitlite:unlocked:${groupId}`;

export function isUnlocked(groupId: string): boolean {
  try {
    return sessionStorage.getItem(unlockKey(groupId)) === "1";
  } catch {
    return false;
  }
}

export function markUnlocked(groupId: string) {
  try {
    sessionStorage.setItem(unlockKey(groupId), "1");
  } catch {
    /* storage unavailable: user re-enters PIN next load */
  }
}

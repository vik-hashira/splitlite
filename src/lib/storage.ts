export interface RecentGroup {
  id: string;
  title: string;
  visitedAt: number;
}

const RECENT_KEY = "splitlite:recent";
const meKey = (groupId: string) => `splitlite:me:${groupId}`;

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* ignore quota / private mode */
  }
}

export const getRecentGroups = () => read<RecentGroup[]>(RECENT_KEY, []);

export function rememberGroup(id: string, title: string) {
  const rest = getRecentGroups().filter((g) => g.id !== id);
  write(RECENT_KEY, [{ id, title, visitedAt: Date.now() }, ...rest].slice(0, 10));
}

export function forgetGroup(id: string) {
  write(RECENT_KEY, getRecentGroups().filter((g) => g.id !== id));
}

export const getMe = (groupId: string) => read<string | null>(meKey(groupId), null);
export const setMe = (groupId: string, name: string) => write(meKey(groupId), name);

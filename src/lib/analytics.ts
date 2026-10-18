import { initializeAnalytics, isSupported, logEvent, type Analytics } from "firebase/analytics";
import { app } from "./firebase";

// Only aggregate, non-identifying params are ever sent: no group IDs, titles, names or amounts.
type EventParams = Record<string, string | number | boolean>;

let analytics: Promise<Analytics | null> | null = null;

function load() {
  if (!analytics) {
    analytics = app && import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
      ? isSupported()
        // RouteTracker logs page views itself; the automatic one would double-count the first load.
        .then((ok) => (ok ? initializeAnalytics(app!, { config: { send_page_view: false } }) : null))
        .catch(() => null)
      : Promise.resolve(null);
  }
  return analytics;
}

export function track(event: string, params?: EventParams) {
  load().then((a) => a && logEvent(a, event, params));
}

/** Hash routes don't trigger GA's automatic page views, so log them per route. */
export function trackPage(path: string, title: string) {
  track("page_view", { page_path: path, page_title: title, page_location: `${location.origin}${location.pathname}#${path}` });
}

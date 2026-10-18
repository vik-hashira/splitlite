import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { trackPage } from "../lib/analytics";

/** Logs a page view per route; group IDs are collapsed so they never reach analytics. */
export default function RouteTracker() {
  const { pathname } = useLocation();
  useEffect(() => {
    const isGroup = pathname.startsWith("/g/");
    trackPage(isGroup ? "/g/:groupId" : pathname, isGroup ? "Group" : "Home");
  }, [pathname]);
  return null;
}

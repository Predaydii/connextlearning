"use client";

import { useEffect } from "react";
import { withBase } from "@/lib/urls";

/** Counts this browser once per day (Bangkok time) for the footer's visit stats. */
export function VisitPing() {
  useEffect(() => {
    try {
      const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Bangkok" });
      if (localStorage.getItem("cl-visit") === today) return;
      localStorage.setItem("cl-visit", today);
      navigator.sendBeacon(withBase("/api/visit"));
    } catch {}
  }, []);
  return null;
}

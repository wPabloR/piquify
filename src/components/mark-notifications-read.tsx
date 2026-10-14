"use client";

import { useEffect } from "react";
import { apiRequest } from "@/lib/api";

export function MarkNotificationsRead() {
  useEffect(() => {
    void apiRequest("/notifications/read", { method: "POST" });
  }, []);
  return null;
}

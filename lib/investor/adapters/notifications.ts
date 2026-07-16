"use client";

import { useQuery } from "@tanstack/react-query";
import type { NotificationSettings } from "../types";

const MOCK_NOTIFICATION_SETTINGS: NotificationSettings = {
  email: { distributions: true, proposals: true, security: true, marketing: false },
  push: { distributions: true, proposals: false, priceAlerts: true },
  distributionThreshold: 100,
  quietHours: { enabled: false, start: "22:00", end: "08:00" },
};

export function useNotificationSettings() {
  return useQuery({
    queryKey: ["investor", "notifications", "settings"],
    queryFn: async () => {
      await new Promise((r) => setTimeout(r, 300));
      return MOCK_NOTIFICATION_SETTINGS;
    },
    staleTime: 60_000,
  });
}

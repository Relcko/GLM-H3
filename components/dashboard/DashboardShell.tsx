"use client";

import { type ReactNode, useState } from "react";
import { motion } from "framer-motion";
import Sidebar from "./Sidebar";
import TestnetBanner from "./TestnetBanner";
import AnalyticsTracker from "./AnalyticsTracker";
import { EASE_LUX } from "@/lib/motion";

export default function DashboardShell({
  portalDone = true,
  children,
}: {
  portalDone?: boolean;
  children: ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="relative min-h-screen dashboard-gradient-dark">
      <AnalyticsTracker />
      <a
        href="#main-content"
        className="fixed left-4 top-4 z-50 -translate-y-20 rounded-xl border border-white/[0.08] bg-bg-base/90 px-4 py-2 text-xs text-white/70 backdrop-blur-xl transition-transform duration-300 focus:translate-y-0 focus-visible:outline-2 focus-visible:outline-accent"
      >
        Skip to content
      </a>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: portalDone ? 1 : 0 }}
        transition={{ duration: 0.5, ease: EASE_LUX, delay: 0.04 }}
      >
        <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      </motion.div>

      <button
        onClick={() => setSidebarOpen((v) => !v)}
        className="fixed left-3 top-[4.5rem] z-30 flex h-9 w-9 items-center justify-center rounded-xl border border-white/[0.08] bg-bg-base/80 backdrop-blur-xl transition-all duration-300 hover:border-accent/30 hover:bg-accent/5 lg:hidden"
        aria-label="Toggle sidebar"
        aria-expanded={sidebarOpen}
      >
        <div className="flex flex-col gap-[5px]">
          <span
            className={`h-px w-4 origin-center bg-white transition-all duration-300 ease-lux ${
              sidebarOpen ? "translate-y-[3px] rotate-45" : ""
            }`}
          />
          <span
            className={`h-px w-4 origin-center bg-white transition-all duration-300 ease-lux ${
              sidebarOpen ? "-translate-y-[3px] -rotate-45" : ""
            }`}
          />
        </div>
      </button>

      <TestnetBanner />

      <main id="main-content" className="relative min-h-screen lg:ml-60">
        <div className="relative mx-auto w-full max-w-7xl px-4 pb-28 pt-20 sm:px-6 md:px-8 lg:px-10 xl:px-12">
          {children}
        </div>
      </main>
    </div>
  );
}

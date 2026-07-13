"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { EASE_LUX } from "@/lib/motion";
import { BETA_VERSION } from "@/lib/beta";
import BugReportDialog from "./BugReportDialog";
import NetworkStatus from "./NetworkStatus";

interface NavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
}

const NAV_ITEMS: NavItem[] = [
  {
    id: "dashboard",
    label: "Dashboard",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <rect x="3" y="3" width="8" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.4" />
        <rect x="13" y="3" width="8" height="4" rx="1.5" stroke="currentColor" strokeWidth="1.4" />
        <rect x="13" y="9" width="8" height="12" rx="1.5" stroke="currentColor" strokeWidth="1.4" />
        <rect x="3" y="13" width="8" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.4" />
      </svg>
    ),
  },
  {
    id: "purchase",
    label: "Buy RLKO",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.4" />
        <path d="M12 8v8M8 12h8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    id: "portfolio",
    label: "Portfolio",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <rect x="3" y="7" width="18" height="13" rx="1.5" stroke="currentColor" strokeWidth="1.4" />
        <path d="M7 7V5a2 2 0 012-2h6a2 2 0 012 2v2" stroke="currentColor" strokeWidth="1.4" />
        <circle cx="16" cy="13.5" r="1.5" fill="currentColor" />
      </svg>
    ),
  },
  {
    id: "staking",
    label: "Staking",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <rect x="5" y="3" width="14" height="18" rx="2" stroke="currentColor" strokeWidth="1.4" />
        <path d="M12 8v8M9 12h6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    id: "stats",
    label: "Statistics",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M4 20h16M6 16l4-6 4 4 4-8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    id: "transactions",
    label: "Transactions",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.4" />
        <path d="M12 7v5l3 2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    id: "monitor",
    label: "Monitor",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <rect x="3" y="3" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="1.4" />
        <path d="M8 21h8M12 17v4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    id: "faq",
    label: "Docs & FAQ",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
        <path d="M14 2v6h6M9 15h6M9 12h6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      </svg>
    ),
  },
];

function scrollToSection(id: string) {
  const el = document.getElementById(id);
  if (el) {
    const top = el.getBoundingClientRect().top + window.scrollY - 100;
    window.scrollTo({ top, behavior: "smooth" });
  }
}

export default function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [showBugReport, setShowBugReport] = useState(false);
  const [active, setActive] = useState("dashboard");

  useEffect(() => {
    const ids = NAV_ITEMS.map((n) => n.id);
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActive(entry.target.id);
          }
        }
      },
      { rootMargin: "-15% 0px -55% 0px" }
    );
    for (const id of ids) {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, []);

  const handleNav = useCallback(
    (id: string) => {
      scrollToSection(id);
      onClose();
    },
    [onClose]
  );

  const sidebarContent = (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-3 px-4 pb-8">
        <Link href="/" className="flex items-center gap-2 transition-opacity hover:opacity-90">
          <Image
            src="/relcko-logo.png"
            alt="Relcko"
            width={100}
            height={30}
            className="h-7 w-auto object-contain"
            priority
          />
        </Link>
      </div>

      <nav className="flex-1 space-y-1 px-3" aria-label="Dashboard navigation">
        {NAV_ITEMS.map((item) => {
          const isActive = active === item.id;
          return (
            <button
              key={item.id}
              onClick={() => handleNav(item.id)}
              className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition-all duration-300 ${
                isActive
                  ? "border border-accent/20 bg-accent/8 text-accent shadow-cyber"
                  : "border border-transparent text-white/45 hover:bg-white/[0.04] hover:text-white/75"
              }`}
              aria-current={isActive ? "true" : undefined}
            >
              <span className={`shrink-0 ${isActive ? "text-accent" : "text-white/30"}`}>
                {item.icon}
              </span>
              <span className="font-medium tracking-wide">{item.label}</span>
              {isActive && (
                <motion.span
                  layoutId="sidebar-active"
                  className="ml-auto h-1.5 w-1.5 rounded-full bg-accent shadow-[0_0_6px_rgba(0,212,255,0.5)]"
                  transition={{ type: "spring", stiffness: 320, damping: 28 }}
                />
              )}
            </button>
          );
        })}
      </nav>

      <div className="border-t border-white/[0.06] px-4 py-4">
        <NetworkStatus />

        <div className="mt-3 flex items-center justify-between">
          <button
            onClick={() => setShowBugReport(true)}
            className="flex items-center gap-1.5 rounded-lg border border-white/[0.06] px-2.5 py-1.5 text-[10px] text-white/40 transition-all hover:border-white/[0.12] hover:text-white/70"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M12 2a7 7 0 00-7 7v4a7 7 0 0014 0V9a7 7 0 00-7-7z" stroke="currentColor" strokeWidth="1.5" />
              <path d="M9 12a3 3 0 006 0M12 2v3m-7 7H2m20 0h-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            Report Bug
          </button>
          <span className="rounded border border-yellow-500/20 bg-yellow-500/8 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-yellow-400/80">
            v{BETA_VERSION}
          </span>
        </div>
      </div>

      <BugReportDialog open={showBugReport} onClose={() => setShowBugReport(false)} />
    </div>
  );

  return (
    <>
      <aside
        className="fixed left-0 top-0 z-40 hidden h-full w-60 flex-col border-r border-white/[0.05] bg-bg-base/80 backdrop-blur-2xl lg:flex"
        aria-label="Sidebar navigation"
      >
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-accent/[0.02] via-transparent to-transparent" />
        <div className="relative z-10 flex h-full flex-col pt-20">{sidebarContent}</div>
      </aside>

      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3, ease: EASE_LUX }}
              className="fixed inset-0 z-[155] bg-black/60 backdrop-blur-sm lg:hidden"
              onClick={onClose}
              aria-hidden="true"
            />
            <motion.aside
              initial={{ x: -300, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -300, opacity: 0 }}
              transition={{ duration: 0.4, ease: EASE_LUX }}
              className="fixed left-0 top-0 z-[156] flex h-full w-60 flex-col border-r border-white/[0.08] bg-bg-base/95 backdrop-blur-2xl lg:hidden"
              aria-label="Mobile sidebar navigation"
            >
              <div className="flex h-full flex-col pt-16">{sidebarContent}</div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

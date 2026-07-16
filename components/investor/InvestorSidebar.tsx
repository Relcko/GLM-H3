"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/shared/cn";
import { INVESTOR_NAV_ITEMS } from "@/lib/investor/navigation";
import {
  LayoutDashboard, PieChart, Building2, TrendingUp, Image,
  Vote, Wallet, Bot, FileText, Bell, CreditCard, Shield, Settings,
  ChevronLeft, Menu, X
} from "lucide-react";

const ICONS: Record<string, React.ElementType> = {
  LayoutDashboard, PieChart, Building2, TrendingUp, Image,
  Vote, Wallet, Bot, FileText, Bell, CreditCard, Shield, Settings,
};

export function InvestorSidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const activeId = INVESTOR_NAV_ITEMS.find(
    (item) => pathname === item.href || pathname.startsWith(item.href + "/")
  )?.id;

  const closeMobile = useCallback(() => setMobileOpen(false), []);

  const sidebarContent = (
    <div className="flex h-full flex-col">
      <div className={cn("flex items-center border-b border-white/[0.05] px-4", collapsed ? "h-16 justify-center" : "h-16")}>
        {!collapsed && (
          <Link href="/investor/dashboard" className="flex items-center gap-2.5" tabIndex={-1}>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent-base/10">
              <span className="text-sm font-bold text-accent-base">R</span>
            </div>
            <span className="text-sm font-semibold tracking-wide text-white">Relcko</span>
          </Link>
        )}
      </div>

      <nav
        className={cn("flex-1 overflow-y-auto py-3", collapsed ? "px-2" : "px-3")}
        aria-label="Investor navigation"
        role="navigation"
      >
        <ul className="space-y-1" role="list">
          {INVESTOR_NAV_ITEMS.filter((item) => item.href).map((item) => {
            const Icon = ICONS[item.icon as string];
            const isActive = activeId === item.id;

            return (
              <li key={item.id}>
                <Link
                  href={item.href!}
                  onClick={closeMobile}
                  className={cn(
                    "group flex items-center gap-3 rounded-xl text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-base/50",
                    collapsed ? "justify-center px-2 py-3" : "px-3 py-2.5",
                    isActive
                      ? "border border-accent/20 bg-accent/[0.08] text-accent-base"
                      : "border border-transparent text-white/45 hover:bg-white/[0.04] hover:text-white/75"
                  )}
                  aria-current={isActive ? "page" : undefined}
                  title={collapsed ? item.label : undefined}
                >
                  {Icon && (
                    <Icon
                      className={cn(
                        "h-5 w-5 shrink-0 transition-colors",
                        isActive ? "text-accent-base" : "text-white/30 group-hover:text-white/50"
                      )}
                      aria-hidden="true"
                    />
                  )}
                  {!collapsed && <span>{item.label}</span>}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className={cn("border-t border-white/[0.05] py-3", collapsed ? "px-2" : "px-3")}>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className={cn(
            "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-white/45 transition-all duration-200 hover:bg-white/[0.04] hover:text-white/75 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-base/50",
            collapsed && "justify-center px-2"
          )}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <ChevronLeft
            className={cn(
              "h-5 w-5 shrink-0 transition-transform duration-300",
              collapsed && "rotate-180"
            )}
            aria-hidden="true"
          />
          {!collapsed && <span>Collapse</span>}
        </button>
      </div>
    </div>
  );

  return (
    <>
      <aside
        className={cn(
          "fixed left-0 top-0 z-40 hidden h-full flex-col border-r border-white/[0.05] bg-bg-base/90 backdrop-blur-2xl transition-all duration-300 lg:flex",
          collapsed ? "w-16" : "w-60"
        )}
        aria-label="Investor sidebar"
      >
        {sidebarContent}
      </aside>

      <button
        onClick={() => setMobileOpen(!mobileOpen)}
        className="fixed left-3 top-[4.5rem] z-50 flex h-9 w-9 items-center justify-center rounded-xl border border-white/[0.08] bg-bg-base/80 backdrop-blur-xl lg:hidden"
        aria-label={mobileOpen ? "Close navigation menu" : "Open navigation menu"}
        aria-expanded={mobileOpen}
      >
        {mobileOpen ? <X className="h-4 w-4 text-white" /> : <Menu className="h-4 w-4 text-white" />}
      </button>

      {mobileOpen && (
        <>
          <div
            className="fixed inset-0 z-[155] bg-black/60 backdrop-blur-sm lg:hidden"
            onClick={closeMobile}
            aria-hidden="true"
          />
          <aside
            className="fixed left-0 top-0 z-[156] flex h-full w-60 border-r border-white/[0.08] bg-bg-base/95 backdrop-blur-2xl lg:hidden"
            aria-label="Investor navigation menu"
          >
            {sidebarContent}
          </aside>
        </>
      )}
    </>
  );
}

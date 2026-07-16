"use client";

import { type ReactNode, useState } from "react";
import { cn } from "@/lib/shared/cn";

interface Tab {
  id: string;
  label: string;
  content: ReactNode;
  disabled?: boolean;
  badge?: number;
}

interface TabsProps {
  tabs: Tab[];
  defaultTab?: string;
  onChange?: (tabId: string) => void;
  variant?: "underline" | "pills";
  className?: string;
}

export function Tabs({ tabs, defaultTab, onChange, variant = "underline", className }: TabsProps) {
  const [activeTab, setActiveTab] = useState(defaultTab || tabs[0]?.id);

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
    onChange?.(tabId);
  };

  return (
    <div className={cn("w-full", className)}>
      <div
        className={cn(
          "flex gap-1",
          variant === "underline" ? "border-b border-white/[0.06]" : ""
        )}
        role="tablist"
      >
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              role="tab"
              aria-selected={isActive}
              aria-disabled={tab.disabled}
              disabled={tab.disabled}
              onClick={() => handleTabChange(tab.id)}
              className={cn(
                "relative flex items-center gap-2 whitespace-nowrap px-4 py-2.5 text-sm font-medium transition-all duration-200 focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2",
                variant === "underline"
                  ? cn(
                      "text-white/50 hover:text-white/80",
                      isActive && "text-accent"
                    )
                  : cn(
                      "rounded-lg text-white/50 hover:text-white/80 hover:bg-white/[0.04]",
                      isActive && "bg-accent/10 text-accent"
                    ),
                tab.disabled && "opacity-40 pointer-events-none"
              )}
            >
              {tab.label}
              {tab.badge !== undefined && tab.badge > 0 && (
                <span className="inline-flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-accent/20 px-1 text-[10px] font-semibold text-accent">
                  {tab.badge}
                </span>
              )}
              {isActive && variant === "underline" && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent rounded-full" />
              )}
            </button>
          );
        })}
      </div>
      <div className="mt-4" role="tabpanel">
        {tabs.find((t) => t.id === activeTab)?.content}
      </div>
    </div>
  );
}

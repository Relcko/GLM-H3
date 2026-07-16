"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/shared/cn";
import {
  LayoutDashboard, Users, Shield, Key, Building2, Store, TrendingUp, Image,
  PieChart, Wallet, Vote, ClipboardCheck, Scan, Settings, Activity, Bot,
  FileSearch, Bell, Megaphone, Flag, Cog, Timer, HardDrive, AlertTriangle,
  PanelLeftClose, PanelLeft,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/shared/ui/Button";
import { ScrollArea } from "@/components/shared/ui/ScrollArea";
import { Tooltip } from "@/components/shared/ui/Tooltip";
import { ADMIN_NAV_ITEMS } from "@/lib/admin/navigation";

const iconMap: Record<string, LucideIcon> = {
  LayoutDashboard, Users, Shield, Key, Building2, Store, TrendingUp, Image,
  PieChart, Wallet, Vote, ClipboardCheck, Scan, Settings, Activity, Bot,
  FileSearch, Bell, Megaphone, Flag, Cog, Timer, HardDrive, AlertTriangle,
};

interface AdminSidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export function AdminSidebar({ collapsed, onToggle }: AdminSidebarProps) {
  const pathname = usePathname();

  return (
    <aside
      className={cn(
        "flex flex-col border-r bg-card transition-all duration-300 ease-in-out",
        collapsed ? "w-16" : "w-64",
      )}
      role="navigation"
      aria-label="Administration navigation"
    >
      <div className="flex h-14 items-center border-b px-4">
        {!collapsed && (
          <Link href="/admin/executive-dashboard" className="flex items-center gap-2 font-semibold">
            <Shield className="h-5 w-5 text-primary" />
            <span>Admin Panel</span>
          </Link>
        )}
        <Button
          variant="ghost"
          size="xs"
          onClick={onToggle}
          className={cn("h-8 w-8", collapsed && "mx-auto")}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <PanelLeft className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
        </Button>
      </div>

      <ScrollArea className="flex-1 py-2">
        <nav className="flex flex-col gap-1 px-2">
          {ADMIN_NAV_ITEMS.map((item) => {
            const Icon = iconMap[item.icon as keyof typeof iconMap];
            const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
            const link = (
              <Link
                href={item.href!}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground",
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground",
                  collapsed && "justify-center px-2",
                )}
                aria-current={isActive ? "page" : undefined}
              >
                {Icon && <Icon className="h-4 w-4 shrink-0" />}
                {!collapsed && <span>{item.label}</span>}
              </Link>
            );
            return collapsed ? <Tooltip key={item.id} content={item.label} position="right">{link}</Tooltip> : <div key={item.id}>{link}</div>;
          })}
        </nav>
      </ScrollArea>
    </aside>
  );
}

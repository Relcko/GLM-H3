"use client";

import { type ReactNode } from "react";

export function GridSection({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`grid grid-cols-12 gap-4 lg:gap-6 ${className}`}>
      {children}
    </div>
  );
}

export function GridMain({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`col-span-12 flex flex-col gap-6 lg:col-span-12 xl:col-span-7 ${className}`}>
      {children}
    </div>
  );
}

export function GridSidebar({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`col-span-12 flex flex-col gap-6 lg:col-span-12 xl:col-span-5 ${className}`}>
      {children}
    </div>
  );
}

export function GridFull({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`col-span-12 ${className}`}>
      {children}
    </div>
  );
}

export function GridHalf({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`col-span-12 lg:col-span-6 ${className}`}>
      {children}
    </div>
  );
}

export function GridThird({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`col-span-12 md:col-span-6 lg:col-span-4 ${className}`}>
      {children}
    </div>
  );
}

export function GridQuarter({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`col-span-6 lg:col-span-3 ${className}`}>
      {children}
    </div>
  );
}

"use client";

import { useRef, useState, type ReactNode } from "react";
import { motion } from "framer-motion";

type Props = {
  children: ReactNode;
  href?: string;
  onClick?: () => void;
  variant?: "primary" | "ghost" | "gold";
  className?: string;
  disabled?: boolean;
  loading?: boolean;
};

export default function MagneticButton({
  children,
  href,
  onClick,
  variant = "primary",
  className = "",
  disabled = false,
  loading = false,
}: Props) {
  const ref = useRef<HTMLAnchorElement>(null);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [hovered, setHovered] = useState(false);
  const [pressed, setPressed] = useState(false);
  const [focused, setFocused] = useState(false);

  const inert = disabled || loading;

  const onMove = (e: React.MouseEvent) => {
    if (inert) return;
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setPos({
      x: (e.clientX - (r.left + r.width / 2)) * 0.4,
      y: (e.clientY - (r.top + r.height / 2)) * 0.45,
    });
  };
  const reset = () => { setPos({ x: 0, y: 0 }); setHovered(false); setPressed(false); };

  const onClickRipple = (e: React.MouseEvent) => {
    if (inert) return;
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const size = Math.max(r.width, r.height);
    const span = document.createElement("span");
    span.className = "ripple";
    span.style.left = `${e.clientX - r.left - size / 2}px`;
    span.style.top = `${e.clientY - r.top - size / 2}px`;
    span.style.width = `${size}px`;
    span.style.height = `${size}px`;
    el.appendChild(span);
    window.setTimeout(() => span.remove(), 700);
  };

  const styles =
    variant === "primary"
      ? "bg-white text-black font-medium btn-depth"
      : variant === "gold"
        ? "bg-gradient-to-r from-[#f5e4b0] to-gold text-black font-medium btn-depth"
        : "border border-white/15 text-white/70 hover:text-white hover:border-white/30 font-light backdrop-blur-sm";

  return (
    <motion.a
      ref={ref}
      href={inert ? undefined : href ?? "#"}
      onClick={(e) => { if (inert) return; onClickRipple(e); onClick?.(); }}
      onMouseMove={onMove}
      onMouseLeave={reset}
      onMouseEnter={() => !inert && setHovered(true)}
      onMouseDown={() => !inert && setPressed(true)}
      onMouseUp={() => setPressed(false)}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      data-cursor={inert ? undefined : "hover"}
      className={`group relative inline-flex items-center justify-center overflow-hidden rounded-full px-7 py-3 text-sm tracking-wide outline-none transition-shadow duration-300 ${styles} ${inert ? "pointer-events-none opacity-40" : ""} ${focused ? "ring-2 ring-accent/60 ring-offset-2 ring-offset-black/80" : ""} ${className}`}
      animate={{ x: pos.x, y: pos.y, scale: pressed ? 0.94 : 1 }}
      transition={{ type: "spring", stiffness: 340, damping: 20, mass: 0.7 }}
      whileHover={{ boxShadow: variant !== "ghost" ? "0 8px 32px rgba(0,0,0,0.35)" : "0 0 24px rgba(255,255,255,0.04)" }}
    >
      {loading && (
        <span className="absolute inset-0 flex items-center justify-center bg-inherit">
          <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2.5" opacity="0.25" />
            <path d="M12 2a10 10 0 019.95 9" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
          </svg>
        </span>
      )}
      {variant !== "ghost" && (
        <span className="absolute inset-0 -translate-x-full skew-x-[-20deg] bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-700 ease-lux group-hover:translate-x-full" />
      )}
      {variant !== "ghost" && (
        <span className="pointer-events-none absolute inset-x-0 top-0 h-1/2 rounded-full bg-gradient-to-b from-white/15 to-transparent" />
      )}
      <motion.span
        className={`relative z-10 flex items-center gap-2 ${loading ? "invisible" : ""}`}
        animate={{ x: pos.x * 0.3, y: pos.y * 0.3 }}
        transition={{ type: "spring", stiffness: 260, damping: 18 }}
      >
        {children}
      </motion.span>
    </motion.a>
  );
}

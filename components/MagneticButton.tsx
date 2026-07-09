"use client";

import { useRef, useState, type ReactNode } from "react";
import { motion } from "framer-motion";

type Props = {
  children: ReactNode;
  href?: string;
  onClick?: () => void;
  variant?: "primary" | "ghost" | "gold";
  className?: string;
};

export default function MagneticButton({
  children,
  href,
  onClick,
  variant = "primary",
  className = "",
}: Props) {
  const ref = useRef<HTMLAnchorElement>(null);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [hovered, setHovered] = useState(false);
  const [pressed, setPressed] = useState(false);

  const onMove = (e: React.MouseEvent) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setPos({
      x: (e.clientX - (r.left + r.width / 2)) * 0.3,
      y: (e.clientY - (r.top + r.height / 2)) * 0.34,
    });
  };
  const reset = () => { setPos({ x: 0, y: 0 }); setHovered(false); setPressed(false); };

  // Click ripple — a premium micro-interaction. Spawns a short-lived
  // span at the click point that expands and fades (CSS animation).
  const onClickRipple = (e: React.MouseEvent) => {
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
    window.setTimeout(() => span.remove(), 650);
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
      href={href ?? "#"}
      onClick={(e) => { onClickRipple(e); onClick?.(); }}
      onMouseMove={onMove}
      onMouseLeave={reset}
      onMouseEnter={() => setHovered(true)}
      onMouseDown={() => setPressed(true)}
      onMouseUp={() => setPressed(false)}
      data-cursor="hover"
      className={`group relative inline-flex items-center justify-center overflow-hidden rounded-full px-7 py-3 text-sm tracking-wide ${styles} ${className}`}
      animate={{ x: pos.x, y: pos.y, scale: pressed ? 0.96 : 1 }}
      transition={{ type: "spring", stiffness: 300, damping: 22, mass: 0.8 }}
    >
      {/* Shimmer sweep — primary & gold only */}
      {variant !== "ghost" && (
        <span className="absolute inset-0 -translate-x-full skew-x-[-20deg] bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-700 ease-lux group-hover:translate-x-full" />
      )}
      {/* Inner top highlight — light refraction on solid buttons */}
      {variant !== "ghost" && (
        <span className="pointer-events-none absolute inset-x-0 top-0 h-1/2 rounded-full bg-gradient-to-b from-white/15 to-transparent" />
      )}
      <motion.span
        className="relative z-10 flex items-center gap-2"
        animate={{ x: pos.x * 0.3, y: pos.y * 0.3 }}
        transition={{ type: "spring", stiffness: 260, damping: 18 }}
      >
        {children}
      </motion.span>
    </motion.a>
  );
}

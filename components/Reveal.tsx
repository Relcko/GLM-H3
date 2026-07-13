"use client";

import { motion, useInView, type Variants } from "framer-motion";
import { useRef, type ReactNode, type MouseEvent } from "react";

const ease = [0.16, 1, 0.3, 1] as const;

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 24, filter: "blur(5px)" },
  show: {
    opacity: 1, y: 0, filter: "blur(0px)",
    transition: { duration: 1, ease },
  },
};

export const fade: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: 1.1, ease } },
};

export const slideRight: Variants = {
  hidden: { opacity: 0, x: -20 },
  show: { opacity: 1, x: 0, transition: { duration: 0.9, ease } },
};

export function Reveal({
  children,
  className = "",
  delay = 0,
  variants = fadeUp,
  as = "div",
  onMouseMove,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  variants?: Variants;
  as?: "div" | "span" | "p" | "h2" | "h3";
  onMouseMove?: (e: MouseEvent<HTMLElement>) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-12% 0px" });

  const Tag = motion[as] as typeof motion.div;
  return (
    <Tag
      ref={ref}
      className={className}
      variants={variants}
      initial="hidden"
      animate={inView ? "show" : "hidden"}
      transition={{ delay }}
      onMouseMove={onMouseMove}
    >
      {children}
    </Tag>
  );
}

export function SplitWords({
  text,
  className = "",
  delay = 0,
}: {
  text: string;
  className?: string;
  delay?: number;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-10% 0px" });

  const words = text.split(" ");
  return (
    <span ref={ref} className={`inline-block ${className}`} aria-label={text}>
      {words.map((w, i) => (
        <span key={i} className="inline-block overflow-hidden align-bottom pb-[0.06em]">
          <motion.span
            className="inline-block"
            initial={{ y: "105%", opacity: 0 }}
            animate={inView ? { y: "0%", opacity: 1 } : { y: "105%", opacity: 0 }}
            transition={{ duration: 0.85, ease, delay: delay + i * 0.07 }}
          >
            {w}{i < words.length - 1 ? "\u00A0" : ""}
          </motion.span>
        </span>
      ))}
    </span>
  );
}

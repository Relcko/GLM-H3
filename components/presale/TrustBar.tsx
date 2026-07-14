"use client";

import { motion } from "framer-motion";
import { EASE_LUX } from "@/lib/motion";

const ITEMS = [
  "Smart Contract Verified",
  "Audited",
  "On-chain Settlement",
  "BNB Smart Chain",
] as const;

function Check() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className="shrink-0 text-accent/70"
    >
      <path
        d="M20 6L9 17l-5-5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function TrustBar({
  items = ITEMS,
}: {
  items?: readonly string[];
}) {
  return (
    <div className="trust-strip">
      <motion.ul
        className="mx-auto flex w-full max-w-[1280px] flex-wrap items-center justify-center gap-x-8 gap-y-2 px-4 py-3 sm:px-6 md:gap-x-10 md:px-8 lg:px-10 xl:px-12"
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: "-10% 0px" }}
        variants={{
          hidden: {},
          show: { transition: { staggerChildren: 0.06, delayChildren: 0.02 } },
        }}
      >
        {items.map((label) => (
          <motion.li
            key={label}
            className="flex items-center gap-2"
            variants={{
              hidden: { opacity: 0, y: 6 },
              show: {
                opacity: 1,
                y: 0,
                transition: { duration: 0.6, ease: EASE_LUX },
              },
            }}
          >
            <Check />
            <span className="institutional-label text-[0.58rem] sm:text-[0.62rem]">
              {label}
            </span>
          </motion.li>
        ))}
      </motion.ul>
    </div>
  );
}
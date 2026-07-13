"use client";

import { motion } from "framer-motion";
import PresaleFAQ from "@/components/presale/PresaleFAQ";
import { LINKS, SALE_META } from "@/lib/presale/config";
import { EXPLORER_URL } from "@/lib/beta";
import { EASE_LUX } from "@/lib/motion";

const DOCS = [
  {
    title: "Whitepaper",
    desc: "Full technical documentation and vision",
    href: LINKS.whitepaper,
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
        <path d="M14 2v6h6M9 15h6M9 12h6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    title: "Tokenomics",
    desc: "Supply, allocation, and distribution details",
    href: "#tokenomics",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.3" />
        <path d="M12 5v14M17 12H7" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    title: "Smart Contract",
    desc: "Verified contracts on BNB Smart Chain",
    href: EXPLORER_URL,
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <rect x="3" y="11" width="18" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.3" />
        <path d="M7 11V7a5 5 0 0110 0v4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    title: "Community",
    desc: "Join the discussion on Telegram and Twitter",
    href: LINKS.telegram,
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
];

export default function DocsFAQ() {
  return (
    <section id="faq" className="relative scroll-mt-24">
      <div className="mb-8">
        <div className="mb-2 flex items-center gap-3">
          <span className="dashboard-accent-line" />
          <span className="dashboard-label">Documents</span>
        </div>
        <h2 className="font-display text-xl font-light text-white/90">Resources</h2>
      </div>

      <div className="mb-12 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {DOCS.map((doc, i) => (
          <motion.a
            key={doc.title}
            href={doc.href}
            target={doc.href.startsWith("http") ? "_blank" : undefined}
            rel={doc.href.startsWith("http") ? "noopener noreferrer" : undefined}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, ease: EASE_LUX, delay: i * 0.08 }}
            className="dashboard-card group block p-5"
          >
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10 text-accent transition-all duration-300 group-hover:bg-accent/20 group-hover:shadow-[0_0_12px_rgba(0,212,255,0.1)]">
              {doc.icon}
            </div>
            <h4 className="font-display text-sm font-light text-white/80 transition-colors group-hover:text-white">
              {doc.title}
            </h4>
            <p className="mt-1 text-xs leading-relaxed text-white/40">{doc.desc}</p>
          </motion.a>
        ))}
      </div>

      <PresaleFAQ />
    </section>
  );
}

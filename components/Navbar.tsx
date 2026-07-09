"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { EASE_LUX } from "@/lib/motion";
import MagneticButton from "./MagneticButton";

const LINKS = [
  { label: "Architecture", href: "#chapter-02" },
  { label: "Innovation", href: "#chapter-03" },
  { label: "Tokenization", href: "#chapter-04" },
  { label: "Investment", href: "#chapter-05" },
  { label: "Ecosystem", href: "#chapter-06" },
];

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const go = (href: string) => (e: React.MouseEvent) => {
    e.preventDefault();
    document.querySelector(href)?.scrollIntoView({ behavior: "smooth" });
    setOpen(false);
  };

  return (
    <>
      <motion.header
        initial={{ y: -40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 1, ease: EASE_LUX, delay: 0.3 }}
        className="fixed left-0 top-0 z-[160] w-full"
      >
        {/* Full-width glass bar */}
        <div
          className={`w-full border-b transition-all duration-700 ease-lux ${
            scrolled
              ? "border-white/[0.04] bg-bg-base/70 shadow-[0_4px_24px_-8px_rgba(0,0,0,0.4)] backdrop-blur-2xl"
              : "border-transparent bg-transparent backdrop-blur-sm"
          }`}
        >
          {/* Inner row: relative so absolute-centered nav works */}
          <div className="relative mx-auto flex h-16 w-full items-center px-5 sm:px-8 md:px-12 lg:px-16">
            {/* Logo — flush left */}
            <a
              href="#top"
              onClick={go("#top")}
              className="flex shrink-0 items-center gap-2 transition-opacity hover:opacity-90"
              aria-label="Relcko home"
            >
              <Wordmark />
            </a>

            {/* Nav — absolutely centered relative to viewport */}
            <nav className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-1 md:flex">
              {LINKS.map((l) => (
                <a
                  key={l.href}
                  href={l.href}
                  onClick={go(l.href)}
                  className="group relative rounded-full px-4 py-2 text-[0.82rem] text-white/65 transition-colors duration-300 hover:text-white"
                >
                  <span className="relative z-10">{l.label}</span>
                  <span className="absolute inset-0 scale-90 rounded-full bg-white/[0.05] opacity-0 transition-all duration-400 ease-lux group-hover:scale-100 group-hover:opacity-100" />
                  <span className="absolute inset-x-4 bottom-1 h-px origin-left scale-x-0 bg-gradient-to-r from-accent/40 to-accent-blue/40 transition-transform duration-400 ease-lux group-hover:scale-x-100" />
                </a>
              ))}
            </nav>

            {/* CTA + hamburger — flush right */}
            <div className="ml-auto flex shrink-0 items-center gap-2">
              <div className="hidden sm:block">
                <MagneticButton
                  href="#chapter-08"
                  variant="primary"
                  className="!px-5 !py-2.5 !text-xs"
                >
                  Invest
                </MagneticButton>
              </div>
              <button
                onClick={() => setOpen((v) => !v)}
                className="glass flex h-10 w-10 items-center justify-center rounded-full transition-all duration-400 ease-lux hover:border-white/15 md:hidden"
                aria-label="Menu"
                aria-expanded={open}
              >
                <div className="flex flex-col gap-[6px]">
                  <span
                    className={`h-px w-5 origin-center bg-white transition-all duration-300 ease-lux ${
                      open ? "translate-y-[3px] rotate-45" : ""
                    }`}
                  />
                  <span
                    className={`h-px w-5 origin-center bg-white transition-all duration-300 ease-lux ${
                      open ? "-translate-y-[3px] -rotate-45" : ""
                    }`}
                  />
                </div>
              </button>
            </div>
          </div>
        </div>
      </motion.header>

      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3, ease: EASE_LUX }}
              className="fixed inset-0 z-[158] bg-black/60 backdrop-blur-sm md:hidden"
              onClick={() => setOpen(false)}
              aria-hidden="true"
            />
            <motion.div
              initial={{ opacity: 0, y: -20, filter: "blur(8px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              exit={{ opacity: 0, y: -20, filter: "blur(8px)" }}
              transition={{ duration: 0.4, ease: EASE_LUX }}
              className="fixed inset-x-0 top-0 z-[159] md:hidden"
            >
              <div className="mx-5 mt-20 flex flex-col gap-2 rounded-3xl border border-white/[0.08] bg-bg-base/90 p-3 shadow-[0_20px_80px_-20px_rgba(0,0,0,0.7)] backdrop-blur-2xl sm:mx-8">
                {LINKS.map((l) => (
                  <a
                    key={l.href}
                    href={l.href}
                    onClick={go(l.href)}
                    className="group relative rounded-2xl px-4 py-3 text-sm text-white/70 transition-all duration-300 hover:bg-white/[0.06] hover:text-white"
                  >
                    <span className="relative z-10">{l.label}</span>
                    <span className="absolute left-4 top-1/2 h-0.5 w-0 -translate-y-1/2 bg-accent/30 transition-all duration-400 ease-lux group-hover:w-6" />
                  </a>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

function Wordmark() {
  return (
    <Image
      src="/relcko-logo.png"
      alt="Relcko"
      width={120}
      height={36}
      className="h-9 w-auto object-contain"
      priority
    />
  );
}

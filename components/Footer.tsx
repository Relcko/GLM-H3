"use client";

import Image from "next/image";
import { motion, useInView } from "framer-motion";
import { useRef, useEffect, useState } from "react";
import MagneticButton from "./MagneticButton";
import { Container } from "./layout";
import { SplitWords } from "@/components/Reveal";
import { EASE_LUX } from "@/lib/motion";

export default function Footer() {
  const spanRef = useRef<HTMLSpanElement>(null);
  const spanInView = useInView(spanRef, { once: true });
  const [spanRevealed, setSpanRevealed] = useState(false);

  const h2Ref = useRef<HTMLHeadingElement>(null);
  const h2InView = useInView(h2Ref, { once: true, margin: "-15% 0px" });
  const [h2Revealed, setH2Revealed] = useState(false);

  useEffect(() => { if (spanInView) setSpanRevealed(true); }, [spanInView]);
  useEffect(() => { if (h2InView) setH2Revealed(true); }, [h2InView]);
  useEffect(() => { const t = setTimeout(() => { setSpanRevealed(true); setH2Revealed(true); }, 4000); return () => clearTimeout(t); }, []);

  return (
    <footer className="relative w-full px-5 pb-12 pt-8 sm:px-8 md:px-12 lg:px-16">
      <Container>
        {/* Final CTA block */}
        <div className="mb-16 flex flex-col items-center text-center">
          <motion.span
            ref={spanRef}
            initial={{ opacity: 0, y: 20 }}
            animate={spanRevealed ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
            transition={{ duration: 0.8, ease: EASE_LUX }}
            className="font-mono text-[0.7rem] uppercase tracking-[0.5em] text-white/40"
          >
            Join the first owners
          </motion.span>
          <motion.h2
            ref={h2Ref}
            initial={{ opacity: 0, y: 30, filter: "blur(10px)" }}
            animate={h2Revealed ? { opacity: 1, y: 0, filter: "blur(0px)" } : { opacity: 0, y: 30, filter: "blur(10px)" }}
            transition={{ duration: 1, ease: EASE_LUX }}
            className="mt-5 max-w-3xl text-balance font-display text-hero font-semibold leading-[0.95] gradient-text"
          >
            <SplitWords text="The door is open." />
          </motion.h2>
          <p className="mt-6 max-w-[20rem] text-balance text-sm leading-relaxed text-white/90">
            Limited tokens. Founding allocation. Be among the first 5,000
            owners of the Relcko flagship.
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <MagneticButton href="#top" variant="gold">
              Become an Owner
            </MagneticButton>
            <MagneticButton href="#chapter-04" variant="ghost">
              How it works
            </MagneticButton>
          </div>
        </div>

        <div className="flex flex-col gap-10 pt-10 md:flex-row md:items-start md:justify-between">
          <div className="max-w-xs">
            <Image
              src="/relcko-logo.png"
              alt="Relcko"
              width={100}
              height={30}
              className="h-8 w-auto object-contain opacity-70"
            />
            <p className="mt-4 text-xs leading-relaxed text-white/30">
              Blockchain-powered real estate tokenization.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-10 sm:grid-cols-3">
            <FooterCol
              title="Platform"
              links={["Architecture", "Tokenization", "Ecosystem", "Roadmap"]}
            />
            <FooterCol
              title="Company"
              links={["About", "Careers", "Press", "Contact"]}
            />
            <FooterCol
              title="Legal"
              links={["Terms", "Privacy", "Disclosures", "Risk"]}
            />
          </div>
        </div>

        <div className="mt-14 flex flex-col items-center justify-between gap-4 pt-6 sm:flex-row">
          <p className="text-xs text-white/30">© 2026 Relcko. All rights reserved.</p>
          <div className="flex items-center gap-4 text-xs text-white/40">
            <a className="transition-colors duration-300 hover:text-white" href="#">
              Twitter / X
            </a>
            <a className="transition-colors duration-300 hover:text-white" href="#">
              LinkedIn
            </a>
            <a className="transition-colors duration-300 hover:text-white" href="#">
              Discord
            </a>
          </div>
        </div>
      </Container>
    </footer>
  );
}

function FooterCol({ title, links }: { title: string; links: string[] }) {
  return (
    <div>
      <h4 className="font-mono text-[0.65rem] uppercase tracking-[0.3em] text-white/30">
        {title}
      </h4>
      <ul className="mt-4 flex flex-col gap-3">
        {links.map((l) => (
          <li key={l}>
            <a
              href="#"
              className="group relative text-sm text-white/50 transition-colors duration-300 hover:text-white"
            >
              {l}
              <span className="absolute -bottom-0.5 left-0 h-px w-0 bg-gradient-to-r from-accent/50 to-accent-blue/50 transition-all duration-400 ease-lux group-hover:w-full" />
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

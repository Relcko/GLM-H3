"use client";

import dynamic from "next/dynamic";
import { motion } from "framer-motion";
import { EASE_LUX } from "@/lib/motion";

const PresalePurchasePanel = dynamic(() => import("@/components/presale/PresalePurchasePanel"), { ssr: false });

export default function StickyBuyConsole() {
  return (
    <motion.div
      initial={false}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, ease: EASE_LUX }}
      className="xl:sticky xl:top-24 xl:max-w-[460px] xl:min-w-[420px]"
    >
      <PresalePurchasePanel />
    </motion.div>
  );
}

"use client";

import { type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import MagneticButton from "@/components/MagneticButton";
import { EASE_LUX } from "@/lib/motion";

export default function ClaimDialog({
  open,
  onClose,
  onConfirm,
  title,
  children,
  loading = false,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  children: ReactNode;
  loading?: boolean;
}) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3, ease: EASE_LUX }}
            className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 20 }}
            transition={{ duration: 0.4, ease: EASE_LUX }}
            className="fixed inset-x-4 top-1/2 z-[201] mx-auto max-w-md -translate-y-1/2"
          >
            <div className="rounded-2xl border border-white/[0.08] bg-bg-base/95 p-6 shadow-[0_20px_80px_-20px_rgba(0,0,0,0.7)] backdrop-blur-sm sm:p-8">
              <h3 className="font-display text-xl font-light text-white/90">
                {title}
              </h3>
              <div className="mt-4 text-sm text-white/60">{children}</div>
              <div className="mt-6 flex gap-3">
                <MagneticButton onClick={onClose} variant="ghost" className="flex-1">
                  Cancel
                </MagneticButton>
                <MagneticButton onClick={onConfirm} variant="primary" className="flex-1">
                  {loading ? "Processing..." : "Confirm"}
                </MagneticButton>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

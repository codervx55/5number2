"use client";

import { motion } from "framer-motion";
import { PhoneOutgoing } from "lucide-react";

export function EmptyState() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="flex h-full min-h-[360px] flex-col items-center justify-center rounded-lg border border-dashed border-border bg-muted/40 px-6 py-14 text-center"
    >
      <span className="mb-4 flex h-11 w-11 items-center justify-center rounded-full bg-white border border-border shadow-xs">
        <PhoneOutgoing size={18} className="text-primary-600" />
      </span>
      <p className="text-[13.5px] font-medium text-foreground">No active number</p>
      <p className="mt-1 max-w-[220px] text-[12.5px] leading-relaxed text-muted-foreground">
        Buy a number from the list to reveal it here and start receiving SMS in real time.
      </p>
    </motion.div>
  );
}

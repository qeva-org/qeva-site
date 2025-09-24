import { ReactNode } from "react";
import { motion } from "framer-motion";

type Props = {
  title?: string;
  children: ReactNode;
  className?: string;
};

export default function GlassPanel({ title, children, className }: Props) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 8, filter: "blur(6px)" }}
      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      transition={{ duration: 0.35 }}
      className={`rounded-2xl border border-white/10 bg-glass backdrop-blur-xs ${className ?? ""}`}
    >
      {title && <div className="px-5 pt-4 text-sm/5 text-slate-300">{title}</div>}
      <div className="p-5">{children}</div>
    </motion.section>
  );
}

import { ComponentProps } from "react";
import { motion } from "framer-motion";

type Props = ComponentProps<"button"> & { loading?: boolean; label: string };

export default function GradientButton({ loading, label, ...rest }: Props) {
  return (
    <motion.button
      whileTap={{ scale: 0.98 }}
      disabled={loading || rest.disabled}
      className="rounded-xl px-5 py-2.5 font-medium bg-gradient-to-r from-neon-violet via-neon-magenta to-neon-cyan hover:opacity-90 disabled:opacity-60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neon-cyan"
      {...rest}
    >
      {loading ? "Working…" : label}
    </motion.button>
  );
}

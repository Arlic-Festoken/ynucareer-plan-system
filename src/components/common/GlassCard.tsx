import { motion } from "framer-motion";
import type { ReactNode } from "react";

type GlassCardProps = {
  children: ReactNode;
  className?: string;
  delay?: number;
};

export default function GlassCard({ children, className = "", delay = 0 }: GlassCardProps) {
  return (
    <motion.section
      className={`glass-card ${className}`}
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.42, delay }}
      whileHover={{ y: -3 }}
    >
      {children}
    </motion.section>
  );
}

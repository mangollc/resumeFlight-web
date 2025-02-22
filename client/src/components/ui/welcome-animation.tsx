import { motion } from "framer-motion";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";

interface WelcomeAnimationProps {
  className?: string;
  text: string;
  onAnimationComplete?: () => void;
}

export function WelcomeAnimation({ className, text, onAnimationComplete }: WelcomeAnimationProps) {
  const { user } = useAuth();
  const [show, setShow] = useState(true);

  useEffect(() => {
    if (show) {
      const timer = setTimeout(() => {
        setShow(false);
        onAnimationComplete?.();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [show, onAnimationComplete]);

  if (!show) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className={cn("space-y-4 text-center lg:text-left", className)}
    >
      <h1 className="text-fluid-h1 bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
        {text}
      </h1>
    </motion.div>
  );
}
import { motion } from "framer-motion";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";

interface WelcomeAnimationProps {
  className?: string;
}

export function WelcomeAnimation({ className }: WelcomeAnimationProps) {
  const { user } = useAuth();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className={cn("space-y-4 text-center lg:text-left", className)}
    >
      <h1 className="text-fluid-h1 bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
        Welcome to ResumeFlight
      </h1>
      <motion.p 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3, duration: 0.5 }}
        className="text-fluid-base text-muted-foreground max-w-md mx-auto lg:mx-0"
      >
        Optimize your resume and boost your career opportunities with AI-powered insights.
      </motion.p>
    </motion.div>
  );
}